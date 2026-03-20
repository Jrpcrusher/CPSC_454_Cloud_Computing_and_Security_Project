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
    if order.get("status") != "awaiting_payment":
        raise HTTPException(
            status_code=400,
            detail=f"Order is not awaiting payment. Current status: {order.get('status')}"
        )

    # Check no existing transaction for this order
    existing = db["transaction"].find_one({
        "order_id": order_id,
        "status": {"$nin": ["failed", "cancelled", "refunded"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="A payment already exists for this order.")

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
    Funds are authorized and held — update transaction + order status.
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

    # Update order -> received (artist can now see the commission)
    db["order"].update_one(
        {"order_id": txn["order_id"]},
        {"$set": {"status": "received"}}
    )

    # Check if escrow is ready (in case art was uploaded before payment)
    check_escrow_ready(txn["order_id"], db)


def handle_payment_intent_succeeded(payment_intent: dict, db):
    """
    Called when `payment_intent.succeeded` fires (funds captured).
    Update transaction status to released.
    """
    pi_id = payment_intent["id"]
    now = datetime.utcnow().isoformat()

    db["transaction"].update_one(
        {"stripe_payment_intent_id": pi_id},
        {"$set": {"status": "released", "updated_at": now}}
    )


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
        {"$set": {"status": "cancelled"}}
    )


# ═══════════════════════════════════════════════════════════════════════════
# 3. ESCROW LOGIC — The core swap
# ═══════════════════════════════════════════════════════════════════════════

def check_escrow_ready(order_id: str, db) -> bool:
    """
    Check if both escrow conditions are met:
      1. Funds are held (transaction status == 'funds_held')
      2. Unwatermarked art has been uploaded

    If both conditions are met, execute the swap.
    Returns True if escrow was released, False otherwise.
    """
    # Condition 1: Funds held?
    txn = db["transaction"].find_one({"order_id": order_id, "status": "funds_held"})
    if not txn:
        return False

    # Condition 2: Unwatermarked art uploaded?
    # Check for the unwatermarked asset in the escrow_assets collection
    # This collection is populated when the artist uploads the final art
    asset = db["escrow_asset"].find_one({"order_id": order_id, "unwatermarked_uploaded": True})
    if not asset:
        return False

    # Both conditions met — execute the swap!
    execute_escrow_release(order_id, txn, db)
    return True


def execute_escrow_release(order_id: str, txn: dict, db):
    """
    THE SWAP: Capture the held funds and release the unwatermarked art.

    1. Capture the PaymentIntent (moves money from hold -> platform balance)
    2. Mark unwatermarked art as released (buyer can now download)
    3. Update transaction status -> released
    4. Update order status -> completed
    5. Trigger artist payout
    """
    client = get_stripe_client()
    pi_id = txn["stripe_payment_intent_id"]
    now = datetime.utcnow().isoformat()

    # Step 1: Capture the funds on Stripe
    try:
        client.payment_intents.capture(pi_id)
    except stripe.StripeError as e:
        # If capture fails, log and don't complete the swap
        db["transaction"].update_one(
            {"transaction_id": txn["transaction_id"]},
            {"$set": {"status": "failed", "updated_at": now}}
        )
        raise HTTPException(status_code=502, detail=f"Failed to capture payment: {str(e)}")

    # Step 2: Release the unwatermarked art to the buyer
    db["escrow_asset"].update_one(
        {"order_id": order_id},
        {"$set": {"released_to_buyer": True, "released_at": now}}
    )

    # Step 3: Update transaction -> released
    db["transaction"].update_one(
        {"transaction_id": txn["transaction_id"]},
        {"$set": {"status": "released", "updated_at": now}}
    )

    # Step 4: Update order -> completed
    db["order"].update_one(
        {"order_id": order_id},
        {"$set": {"status": "completed"}}
    )

    # Step 5: Payout the artist
    payout_artist(order_id, txn, db)


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
    """
    client = get_stripe_client()
    artist_id = txn["artist_id"]
    now = datetime.utcnow().isoformat()

    # Look up the artist's Stripe connected account
    artist = db["user"].find_one({"user_id": artist_id})
    if not artist or not artist.get("stripe_account_id"):
        # Artist hasn't onboarded yet — mark for manual payout later
        db["transaction"].update_one(
            {"transaction_id": txn["transaction_id"]},
            {"$set": {
                "status": "released",
                "updated_at": now,
                "payout_note": "Artist has no Stripe account -- payout pending onboarding.",
            }}
        )
        return

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
                    "transaction_id": txn["transaction_id"],
                    "platform_fee": str(platform_fee),
                },
            }
        )
    except stripe.StripeError as e:
        # Transfer failed — funds are captured but payout didn't go through
        db["transaction"].update_one(
            {"transaction_id": txn["transaction_id"]},
            {"$set": {
                "updated_at": now,
                "payout_note": f"Payout failed: {str(e)}",
            }}
        )
        return

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
        else:
            # Funds were captured — issue a refund
            client.refunds.create(params={"payment_intent": pi_id})
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe refund error: {str(e)}")

    db["transaction"].update_one(
        {"transaction_id": txn["transaction_id"]},
        {"$set": {"status": "refunded", "updated_at": now}}
    )

    db["order"].update_one(
        {"order_id": order_id},
        {"$set": {"status": "cancelled"}}
    )

    return {"detail": "Refund processed successfully."}


# ═══════════════════════════════════════════════════════════════════════════
# 6. ESCROW ASSET TRACKING — Called by art upload flow
# ═══════════════════════════════════════════════════════════════════════════

def register_escrow_asset(order_id: str, s3_watermarked_path: str,
                          s3_unwatermarked_path: str, db):
    """
    Called when the artist uploads the final artwork.
    Registers both the watermarked (for buyer preview) and unwatermarked
    (for release after escrow) versions.

    Then checks if escrow is ready to release.
    """
    now = datetime.utcnow().isoformat()

    # Upsert the escrow asset record
    db["escrow_asset"].update_one(
        {"order_id": order_id},
        {"$set": {
            "order_id": order_id,
            "s3_watermarked_path": s3_watermarked_path,
            "s3_unwatermarked_path": s3_unwatermarked_path,
            "unwatermarked_uploaded": True,
            "released_to_buyer": False,
            "uploaded_at": now,
        }},
        upsert=True
    )

    # Update order status to show artwork is ready for review
    db["order"].update_one(
        {"order_id": order_id},
        {"$set": {"status": "in_progress"}}
    )

    # Check if escrow can complete (funds might already be held)
    return check_escrow_ready(order_id, db)


def get_buyer_download(order_id: str, buyer_id: str, db):
    """
    Returns the S3 path for the unwatermarked art — only if escrow has released it.
    The S3 service (Arctic's responsibility) will generate the presigned URL.
    """
    asset = db["escrow_asset"].find_one({"order_id": order_id})
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

    return {
        "order_id": order_id,
        "s3_unwatermarked_path": asset["s3_unwatermarked_path"],
        # TODO: Arctic's s3_service will generate a presigned download URL from this path
    }


# ═══════════════════════════════════════════════════════════════════════════
# 7. TRANSACTION DB HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def get_transaction_by_order(order_id: str, db):
    """Get the active transaction for an order."""
    txn = db["transaction"].find_one(
        {"order_id": order_id},
        {"_id": 0}
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
