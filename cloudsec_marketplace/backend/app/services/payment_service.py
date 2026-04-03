"""
Payment Service — Stripe integration + Escrow logic

Uses the modern StripeClient pattern (v8+) instead of the deprecated stripe.api_key.
See: https://github.com/stripe/stripe-python#stripeclient-vs-legacy-pattern

Responsibilities:
  1. Create PaymentIntents (manual capture -> funds held)
  2. Capture funds when escrow conditions are met
  3. Handle refunds / cancellations
  4. Payout artists via Stripe Connect Transfers
  5. Escrow check: are both funds AND unwatermarked art present?
"""

import stripe
from stripe import StripeClient
from uuid import uuid4
from datetime import datetime
from fastapi import HTTPException

from app.core.config import settings

# ── Stripe SDK initialization (modern StripeClient pattern) ────────────────
# The client is initialized once at module load and reused across all requests.
# If STRIPE_SECRET_KEY is not set, we defer errors to request-time so the app
# can still start (useful for teammates who don't have Stripe keys).
_stripe_client: StripeClient | None = None

def get_stripe_client() -> StripeClient:
    """Get or create the Stripe client. Raises if not configured."""
    global _stripe_client
    if _stripe_client is None:
        if not settings.STRIPE_SECRET_KEY:
            raise HTTPException(
                status_code=500,
                detail="Stripe is not configured. Set STRIPE_SECRET_KEY in your .env file."
            )
        _stripe_client = StripeClient(settings.STRIPE_SECRET_KEY)
    return _stripe_client


# ═══════════════════════════════════════════════════════════════════════════
# 1. PAYMENT INTENT — Buyer initiates payment
# ═══════════════════════════════════════════════════════════════════════════

def create_payment_intent(order_id: str, buyer_id: str, artist_id: str,
                          amount: int, currency: str, db):
    """
    Create a Stripe PaymentIntent with manual capture (authorize only).
    The funds are placed on hold — NOT captured until escrow releases.

    Returns the transaction document and the client_secret for the frontend.
    """
    client = get_stripe_client()

    # Verify the order exists and is in the right state
    order = db["order"].find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    if order.get("status") != "received":
        raise HTTPException(
            status_code=400,
            detail=f"Payment can only be started for orders in 'received' status. Current status: {order.get('status')}"
        )

    # Check no existing active transaction for this order
    existing = db["transaction"].find_one({
        "order_id": order_id,
        "status": {"$nin": ["failed", "refunded", "canceled"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Active transaction already exists for this order.")

    # Create the Stripe PaymentIntent — manual capture holds funds without charging
    try:
        intent = client.payment_intents.create(
            params={
                "amount": amount,
                "currency": currency,
                "capture_method": "manual",  # KEY: authorize only, capture later
                "metadata": {
                    "order_id": order_id,
                    "buyer_id": buyer_id,
                    "artist_id": artist_id,
                },
            }
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")

    # Persist the transaction in MongoDB
    transaction = {
        "transaction_id": str(uuid4()),
        "order_id": order_id,
        "buyer_id": buyer_id,
        "artist_id": artist_id,
        "amount": amount,
        "currency": currency,
        "stripe_payment_intent_id": intent.id,
        "stripe_payout_id": None,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    db["transaction"].insert_one(transaction)

    # Link the transaction back to the order
    db["order"].update_one(
        {"order_id": order_id},
        {"$set": {"transaction_id": transaction["transaction_id"]}},
    )

    return {
        "client_secret": intent.client_secret,
        "transaction_id": transaction["transaction_id"],
        "stripe_payment_intent_id": intent.id,
    }


# ═══════════════════════════════════════════════════════════════════════════
# 2. WEBHOOK HANDLERS — Stripe -> our server
# ═══════════════════════════════════════════════════════════════════════════

def handle_payment_intent_authorized(payment_intent: dict, db):
    """
    Called when `payment_intent.amount_capturable_updated` fires.
    Funds are authorized and held — update transaction status only.
    Order status is managed by the order workflow (accept/decline/etc.).
    """
    pi_id = payment_intent["id"]
    txn = db["transaction"].find_one({"stripe_payment_intent_id": pi_id})
    if not txn:
        return  # Unknown transaction — ignore

    now = datetime.utcnow().isoformat()

    # Update transaction -> funds_held
    db["transaction"].update_one(
        {"stripe_payment_intent_id": pi_id},
        {"$set": {"status": "funds_held", "updated_at": now}}
    )

    # Check if escrow is ready (in case art was uploaded before payment)
    check_escrow_ready(txn["order_id"], db)


def handle_payment_intent_succeeded(payment_intent: dict, db):
    """
    Called when `payment_intent.succeeded` fires (funds captured).
    Update transaction status to released — but only if the transaction
    hasn't already progressed past this state (e.g. to payout_sent).
    """
    pi_id = payment_intent["id"]
    now = datetime.utcnow().isoformat()

    result = db["transaction"].update_one(
        {
            "stripe_payment_intent_id": pi_id,
            "status": {"$nin": ["released", "payout_sent"]},
        },
        {"$set": {"status": "released", "updated_at": now}},
    )

    if result.matched_count == 0:
        # Transaction already at released/payout_sent — nothing to do
        return


def handle_payment_intent_failed(payment_intent: dict, db):
    """
    Called when `payment_intent.payment_failed` fires.
    Mark transaction as failed and cancel the order.
    """
    pi_id = payment_intent["id"]
    now = datetime.utcnow().isoformat()

    txn = db["transaction"].find_one({"stripe_payment_intent_id": pi_id})
    if not txn:
        return

    db["transaction"].update_one(
        {"stripe_payment_intent_id": pi_id},
        {"$set": {"status": "failed", "updated_at": now}}
    )

    db["order"].update_one(
        {"order_id": txn["order_id"]},
        {"$set": {"status": "declined"}}
    )


def handle_payment_intent_canceled(payment_intent: dict, db):
    """
    Called when `payment_intent.canceled` fires (intent canceled or hold expired).
    This is NOT a payment failure — the hold simply lapsed or was explicitly canceled.

    Sets transaction status to 'canceled'. Does NOT change order status;
    the order workflow (accept/decline) owns that transition.
    """
    pi_id = payment_intent["id"]
    now = datetime.utcnow().isoformat()

    txn = db["transaction"].find_one({"stripe_payment_intent_id": pi_id})
    if not txn:
        return  # Unknown transaction — ignore

    db["transaction"].update_one(
        {"stripe_payment_intent_id": pi_id},
        {"$set": {"status": "canceled", "updated_at": now}},
    )


# ═══════════════════════════════════════════════════════════════════════════
# 3. ESCROW LOGIC — The core swap
# ═══════════════════════════════════════════════════════════════════════════

def check_escrow_ready(order_id: str, db) -> bool:
    """
    Check if ALL 4 escrow conditions are met before releasing:
      1. Funds are held (transaction status == 'funds_held')
      2. Unwatermarked art has been uploaded (order_asset.art_uploaded)
      3. Client has approved the order (order.client_approval == True)
      4. Artist has approved the order (order.artist_approval == True)

    If all conditions are met, execute the swap.
    Returns True if escrow was released, False otherwise.
    """
    # Condition 1: Order exists with both approvals?
    order = db["order"].find_one({"order_id": order_id})
    if not order:
        return False

    # Condition 2: Client approved?
    if not order.get("client_approval", False):
        return False

    # Condition 3: Artist approved?
    if not order.get("artist_approval", False):
        return False

    # Condition 4: Funds held?
    txn = db["transaction"].find_one({"order_id": order_id, "status": "funds_held"})
    if not txn:
        return False

    # Condition 5: Art uploaded?
    asset = db["order_asset"].find_one({"order_id": order_id, "art_uploaded": True})
    if not asset:
        return False

    # All 4 conditions met — execute the swap!
    execute_escrow_release(order_id, txn, db)
    return True


def execute_escrow_release(order_id: str, txn: dict, db):
    """
    Escrow release sequence. Each step only runs if the prior step succeeded.

    Execution order:
      1. Atomically claim the release (prevent double-execution via race condition)
      2. Re-verify all 4 escrow conditions against current DB state
      3. Capture the PaymentIntent (Stripe: authorize -> capture)
      4. Update transaction status -> released
      5. Transfer funds to artist via Stripe Connect (payout_artist)
      6. Update transaction status -> payout_sent
      7. Mark order as completed
      8. Release unwatermarked art to buyer (released_to_buyer = True)

    Partial failure scenarios:
      - Capture fails (step 3): Transaction set to 'failed'. Art NOT released.
        Recovery: Create a new PaymentIntent and retry.
      - Payout fails (step 5): Transaction stays at 'released' (funds captured
        on platform) with a payout_note. Art is NOT released to buyer. Order is
        NOT marked completed. Manual ops intervention needed to retry the
        transfer or issue a refund.
      - Artist has no Stripe Connect account: Same as payout failure — funds
        captured but art withheld until artist onboards and payout is retried.
    """
    import logging
    logger = logging.getLogger(__name__)

    client = get_stripe_client()
    txn_id = txn["transaction_id"]

    # Step 1: Atomically claim the release — prevents double-execution.
    # Only proceeds if the transaction is still in 'funds_held' state.
    claimed = db["transaction"].find_one_and_update(
        {"transaction_id": txn_id, "status": "funds_held"},
        {"$set": {"updated_at": datetime.utcnow().isoformat()}},
    )
    if not claimed:
        logger.info(
            f"Escrow release already claimed or transaction not in funds_held: "
            f"order_id={order_id}, transaction_id={txn_id}"
        )
        return

    # Step 2: Re-verify all 4 escrow conditions against current DB state.
    order = db["order"].find_one({"order_id": order_id})
    if not order:
        logger.error(f"Escrow release aborted — order not found: order_id={order_id}")
        return
    if not order.get("client_approval") or not order.get("artist_approval"):
        logger.error(
            f"Escrow release aborted — missing approvals: order_id={order_id}, "
            f"client_approval={order.get('client_approval')}, "
            f"artist_approval={order.get('artist_approval')}"
        )
        return
    asset = db["order_asset"].find_one({"order_id": order_id, "art_uploaded": True})
    if not asset:
        logger.error(f"Escrow release aborted — no uploaded art: order_id={order_id}")
        return

    pi_id = txn["stripe_payment_intent_id"]
    now = datetime.utcnow().isoformat()

    # Step 3: Capture the PaymentIntent on Stripe.
    try:
        client.payment_intents.capture(pi_id)
    except stripe.StripeError as e:
        db["transaction"].update_one(
            {"transaction_id": txn_id},
            {"$set": {"status": "failed", "updated_at": datetime.utcnow().isoformat()}}
        )
        raise HTTPException(status_code=502, detail=f"Failed to capture payment: {str(e)}")

    # Step 4: Transaction -> released (funds captured on platform).
    db["transaction"].update_one(
        {"transaction_id": txn_id},
        {"$set": {"status": "released", "updated_at": datetime.utcnow().isoformat()}},
    )

    # Step 5: Transfer funds to artist via Stripe Connect.
    # payout_artist now raises on failure — catch so we can withhold art.
    try:
        payout_artist(order_id, txn, db)
    except Exception as e:
        # Payout failed (no Connect account or Stripe transfer error).
        # Funds are captured (transaction='released') but art is NOT released.
        # Manual intervention needed to retry payout or issue refund.
        logger.critical(
            f"PAYOUT FAILED — art withheld: order_id={order_id}, "
            f"transaction_id={txn_id}, error={str(e)}. "
            f"Transaction is 'released' (funds captured). "
            f"Manual intervention required to retry payout or issue refund."
        )
        return

    # Step 6: Order -> completed.
    db["order"].update_one(
        {"order_id": order_id},
        {"$set": {"status": "completed"}},
    )

    # Step 7: Release unwatermarked art to buyer.
    db["order_asset"].update_one(
        {"order_id": order_id},
        {"$set": {"released_to_buyer": True, "released_at": datetime.utcnow().isoformat()}},
    )


# ═══════════════════════════════════════════════════════════════════════════
# 4. ARTIST PAYOUT — Platform pays the artist via Stripe Connect
# ═══════════════════════════════════════════════════════════════════════════

def create_artist_connect_account(artist_id: str, email: str, db) -> dict:
    """
    Create a Stripe Connect Express account for an artist.
    Returns the onboarding URL so the artist can complete setup.
    """
    client = get_stripe_client()

    try:
        account = client.accounts.create(
            params={
                "type": "express",
                "email": email,
                "metadata": {"artist_id": artist_id},
                "capabilities": {
                    "transfers": {"requested": True},
                },
            }
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")

    # Store the Stripe account ID on the user document
    db["user"].update_one(
        {"user_id": artist_id},
        {"$set": {"stripe_account_id": account.id}}
    )

    # Create an onboarding link
    try:
        account_link = client.account_links.create(
            params={
                "account": account.id,
                "refresh_url": "http://localhost:3000/artist/onboard/refresh",  # TODO: use real domain
                "return_url": "http://localhost:3000/artist/onboard/complete",  # TODO: use real domain
                "type": "account_onboarding",
            }
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")

    return {
        "stripe_account_id": account.id,
        "onboarding_url": account_link.url,
    }


def payout_artist(order_id: str, txn: dict, db):
    """
    Transfer funds from the platform's Stripe balance to the artist's
    connected account. Deducts the platform fee.

    Raises HTTPException on failure so the caller (execute_escrow_release)
    can withhold art release. Increments payout_attempts on every call
    so stuck transactions can be queried for retry:
        db["transaction"].find({"status": "released", "payout_attempts": {"$gt": 0}})
    """
    client = get_stripe_client()
    artist_id = txn["artist_id"]
    txn_id = txn["transaction_id"]
    now = datetime.utcnow().isoformat()

    # Increment payout_attempts on every call
    db["transaction"].update_one(
        {"transaction_id": txn_id},
        {"$inc": {"payout_attempts": 1}, "$set": {"updated_at": now}},
    )

    # Look up the artist's Stripe connected account
    artist = db["user"].find_one({"user_id": artist_id})
    if not artist or not artist.get("stripe_account_id"):
        # Artist hasn't onboarded — record the blocker and raise so caller knows
        db["transaction"].update_one(
            {"transaction_id": txn_id},
            {"$set": {
                "updated_at": now,
                "payout_note": "Artist has no Stripe Connect account — payout blocked until onboarding.",
            }}
        )
        raise HTTPException(
            status_code=400,
            detail="Artist must complete Stripe Connect onboarding before payout can be sent.",
        )

    # Calculate payout amount (subtract platform fee)
    platform_fee = int(txn["amount"] * (settings.PLATFORM_FEE_PERCENT / 100))
    payout_amount = txn["amount"] - platform_fee

    try:
        transfer = client.transfers.create(
            params={
                "amount": payout_amount,
                "currency": txn["currency"],
                "destination": artist["stripe_account_id"],
                "metadata": {
                    "order_id": order_id,
                    "transaction_id": txn_id,
                    "platform_fee": str(platform_fee),
                },
            }
        )
    except stripe.StripeError as e:
        # Transfer failed — record the error and re-raise so caller can act
        db["transaction"].update_one(
            {"transaction_id": txn_id},
            {"$set": {
                "updated_at": datetime.utcnow().isoformat(),
                "payout_note": f"Stripe transfer failed: {str(e)}",
            }}
        )
        raise HTTPException(
            status_code=502,
            detail=f"Stripe transfer to artist failed: {str(e)}",
        )

    # Update transaction with payout info
    db["transaction"].update_one(
        {"transaction_id": txn["transaction_id"]},
        {"$set": {
            "stripe_payout_id": transfer.id,
            "status": "payout_sent",
            "platform_fee": platform_fee,
            "payout_amount": payout_amount,
            "updated_at": now,
        }}
    )


# ═══════════════════════════════════════════════════════════════════════════
# 5. REFUNDS — Cancel / refund when things go wrong
# ═══════════════════════════════════════════════════════════════════════════

def refund_order(order_id: str, db):
    """
    Refund the buyer. If funds were only authorized, cancel the intent.
    If funds were captured, issue a refund.
    """
    client = get_stripe_client()

    txn = db["transaction"].find_one({
        "order_id": order_id,
        "status": {"$in": ["pending", "funds_held", "released"]}
    })
    if not txn:
        raise HTTPException(status_code=404, detail="No active transaction found for this order.")

    pi_id = txn["stripe_payment_intent_id"]
    now = datetime.utcnow().isoformat()

    try:
        if txn["status"] in ("pending", "funds_held"):
            # Funds only authorized — just cancel the PaymentIntent
            client.payment_intents.cancel(pi_id)
            final_status = "canceled"
        else:
            # Funds were captured — issue a refund
            client.refunds.create(params={"payment_intent": pi_id})
            final_status = "refunded"
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe refund error: {str(e)}")

    db["transaction"].update_one(
        {"transaction_id": txn["transaction_id"]},
        {"$set": {"status": final_status, "updated_at": now}}
    )

    db["order"].update_one(
        {"order_id": order_id},
        {"$set": {"status": "declined"}}
    )

    return {"detail": "Refund processed successfully."}


# ═══════════════════════════════════════════════════════════════════════════
# 6. ESCROW ASSET TRACKING — Called by art upload flow
# ═══════════════════════════════════════════════════════════════════════════

def mark_art_uploaded_for_escrow(order_id: str, db):
    """
    Called after the artist uploads artwork and an active transaction exists.
    Stamps `uploaded_at` on the existing order_asset document (which was
    already created by db_service.upload_order_image) and then checks if
    escrow is ready to release.

    The order_asset doc must already exist with art_uploaded=True — if it
    doesn't, something went wrong in the upload flow.
    """
    import logging
    logger = logging.getLogger(__name__)

    asset = db["order_asset"].find_one({"order_id": order_id, "art_uploaded": True})
    if not asset:
        logger.warning(
            f"mark_art_uploaded_for_escrow called but no order_asset with "
            f"art_uploaded=True for order_id={order_id}"
        )
        return False

    now = datetime.utcnow().isoformat()
    db["order_asset"].update_one(
        {"order_id": order_id},
        {"$set": {"uploaded_at": now}},
    )

    # Check if escrow can complete (funds might already be held)
    return check_escrow_ready(order_id, db)


def get_buyer_download(order_id: str, buyer_id: str, db):
    """
    Returns the S3 path for the unwatermarked art — only if escrow has released it.
    The S3 service (Arctic's responsibility) will generate the presigned URL.
    """
    asset = db["order_asset"].find_one({"order_id": order_id})
    if not asset:
        raise HTTPException(status_code=404, detail="No artwork found for this order.")
    if not asset.get("released_to_buyer"):
        raise HTTPException(
            status_code=403,
            detail="Artwork has not been released yet. Escrow is still in progress."
        )

    # Verify the requester is the buyer
    order = db["order"].find_one({"order_id": order_id})
    if not order or order.get("client", {}).get("user_id") != buyer_id:
        raise HTTPException(status_code=403, detail="You are not the buyer for this order.")

    # Verify the order is completed
    if order.get("status") != "completed":
        raise HTTPException(status_code=403, detail="Order is not yet completed.")

    return {
        "order_id": order_id,
        "unwatermarked_key": asset["unwatermarked_key"],
    }


# ═══════════════════════════════════════════════════════════════════════════
# 7. TRANSACTION DB HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def get_transaction_by_order(order_id: str, db):
    """Get the most recent transaction for an order (sorted by created_at descending)."""
    txn = db["transaction"].find_one(
        {"order_id": order_id},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    if not txn:
        raise HTTPException(status_code=404, detail="No transaction found for this order.")
    return txn


def get_transactions_for_user(user_id: str, db):
    """Get all transactions where the user is buyer or artist."""
    transactions = list(db["transaction"].find(
        {"$or": [{"buyer_id": user_id}, {"artist_id": user_id}]},
        {"_id": 0}
    ))
    return transactions
