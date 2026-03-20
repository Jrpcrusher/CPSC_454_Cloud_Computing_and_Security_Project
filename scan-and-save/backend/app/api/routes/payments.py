"""
Payment Routes — Stripe PaymentIntents, Webhooks, Escrow, Payouts

Endpoints:
  POST /payments/create-intent       → Buyer initiates payment for an order
  GET  /payments/config              → Frontend gets Stripe publishable key
  GET  /payments/{order_id}/status   → Check transaction status for an order
  POST /payments/webhook             → Stripe webhook receiver
  POST /payments/{order_id}/artwork-uploaded → Signal that artist uploaded final art
  GET  /payments/{order_id}/download → Buyer downloads released unwatermarked art
  POST /payments/{order_id}/refund   → Refund / cancel a payment
  POST /payments/artist/onboard      → Artist sets up Stripe Connect account
  GET  /payments/artist/onboard/status → Check artist onboarding status
  GET  /payments/my-transactions     → User views their transactions
"""

import stripe
from stripe import StripeClient
from fastapi import APIRouter, Depends, Request, HTTPException
from app.api.deps import get_db
from app.core.config import settings
from app.services import payment_service
from app.services.payment_service import get_stripe_client
from app.models.transaction import (
    CreatePaymentRequest,
    PaymentIntentResponse,
    TransactionStatusResponse,
)

router = APIRouter()


# ─── Frontend Config ────────────────────────────────────────────────────────

@router.get("/config")
def get_stripe_config():
    """Return the publishable key so the frontend can initialize Stripe.js."""
    if not settings.STRIPE_PUBLISHABLE_KEY:
        raise HTTPException(status_code=500, detail="Stripe publishable key not configured.")
    return {"publishable_key": settings.STRIPE_PUBLISHABLE_KEY}


# ─── Create Payment Intent ──────────────────────────────────────────────────

@router.post("/create-intent", response_model=PaymentIntentResponse)
def create_payment_intent(payload: CreatePaymentRequest, db=Depends(get_db)):
    """
    Buyer initiates payment for an order.
    Creates a Stripe PaymentIntent with manual capture (funds held, not charged).
    Returns client_secret for the frontend to confirm the payment.

    NOTE: Once auth is implemented this should use
    `current_user = Depends(get_current_user)` to get the buyer_id automatically.
    For now, buyer_id and artist_id are pulled from the order document.
    """
    # Look up the order to get buyer and artist info
    order = db["order"].find_one({"order_id": str(payload.order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    buyer_id = order["client"]["user_id"]
    artist_id = order["artist"]["user_id"]

    result = payment_service.create_payment_intent(
        order_id=str(payload.order_id),
        buyer_id=buyer_id,
        artist_id=artist_id,
        amount=payload.amount,
        currency=payload.currency,
        db=db,
    )
    return result


# ─── Transaction Status ─────────────────────────────────────────────────────

@router.get("/{order_id}/status", response_model=TransactionStatusResponse)
def get_transaction_status(order_id: str, db=Depends(get_db)):
    """Check the payment/escrow status for a given order."""
    return payment_service.get_transaction_by_order(order_id, db)


# ─── Stripe Webhook ─────────────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(request: Request, db=Depends(get_db)):
    """
    Receives Stripe webhook events and updates transaction/order state.

    IMPORTANT: This endpoint uses the raw request body (not JSON parsing)
    because Stripe requires the exact raw body for signature verification.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured.")

    # Verify the webhook signature using the StripeClient's built-in method
    try:
        client = get_stripe_client()
        event = client.webhooks.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload.")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature.")

    # Route events to the appropriate handler
    event_type = event["type"]
    payment_intent = event["data"]["object"]

    if event_type == "payment_intent.amount_capturable_updated":
        # Funds have been authorized and are being held
        payment_service.handle_payment_intent_authorized(payment_intent, db)

    elif event_type == "payment_intent.succeeded":
        # Funds have been captured (after escrow release)
        payment_service.handle_payment_intent_succeeded(payment_intent, db)

    elif event_type == "payment_intent.payment_failed":
        # Payment failed
        payment_service.handle_payment_intent_failed(payment_intent, db)

    elif event_type == "payment_intent.canceled":
        # Payment intent expired or was cancelled
        payment_service.handle_payment_intent_failed(payment_intent, db)

    return {"status": "ok"}


# ─── Artwork Upload Signal (Escrow Trigger) ──────────────────────────────────

@router.post("/{order_id}/artwork-uploaded")
def artwork_uploaded(order_id: str, db=Depends(get_db)):
    """
    Called when the artist uploads the final artwork (both watermarked + unwatermarked).
    The actual file upload goes through the S3/upload service (Arctic's domain).
    This endpoint just signals the escrow system to check if it can complete the swap.

    NOTE: In production, this should be called internally by the upload route,
    not directly by the client. For now it's exposed for testing/integration.

    Expects the escrow_asset record to already exist in the DB
    (populated by the upload service via payment_service.register_escrow_asset).
    """
    released = payment_service.check_escrow_ready(order_id, db)
    if released:
        return {"detail": "Escrow conditions met! Swap executed — buyer gets art, artist gets paid."}
    else:
        return {"detail": "Escrow not yet ready. Waiting for both funds and artwork."}


# ─── Buyer Download ─────────────────────────────────────────────────────────

@router.get("/{order_id}/download")
def download_artwork(order_id: str, db=Depends(get_db)):
    """
    Buyer downloads the unwatermarked artwork after escrow releases it.

    NOTE: Once auth is implemented, this should use get_current_user
    to verify the requester is the actual buyer. For now, returns the
    S3 path — Arctic's s3_service will generate the presigned URL.
    """
    # TODO: Replace with actual buyer_id from get_current_user dependency
    # For now, we just check if the asset is released
    asset = db["escrow_asset"].find_one({"order_id": order_id})
    if not asset:
        raise HTTPException(status_code=404, detail="No artwork found for this order.")
    if not asset.get("released_to_buyer"):
        raise HTTPException(status_code=403, detail="Artwork not yet released. Escrow still in progress.")

    return {
        "order_id": order_id,
        "s3_unwatermarked_path": asset["s3_unwatermarked_path"],
        "message": "Use this path with the S3 service to generate a download URL.",
    }


# ─── Refund ──────────────────────────────────────────────────────────────────

@router.post("/{order_id}/refund")
def refund_payment(order_id: str, db=Depends(get_db)):
    """
    Refund the buyer. Cancels the PaymentIntent if funds are only held,
    or issues a Stripe Refund if funds were already captured.
    """
    return payment_service.refund_order(order_id, db)


# ─── Artist Onboarding (Stripe Connect) ─────────────────────────────────────

@router.post("/artist/onboard")
def onboard_artist(db=Depends(get_db)):
    """
    Creates a Stripe Connect Express account for the artist and returns
    the onboarding URL.

    NOTE: Once auth is implemented, artist_id and email should come from
    get_current_user. For now, expect them in the request body.
    """
    # TODO: Use get_current_user to get artist info automatically
    # Placeholder — will need artist_id and email from auth
    raise HTTPException(
        status_code=501,
        detail="Artist onboarding requires auth (get_current_user). "
               "Waiting for Jrpcrusher's auth implementation. "
               "Call payment_service.create_artist_connect_account() once auth is ready."
    )


@router.get("/artist/onboard/status")
def check_artist_onboard_status(db=Depends(get_db)):
    """
    Check if the current artist has completed Stripe Connect onboarding.

    NOTE: Requires auth to identify the artist.
    """
    # TODO: Use get_current_user to get artist_id
    raise HTTPException(
        status_code=501,
        detail="Requires auth implementation to identify the artist."
    )


# ─── User Transactions ──────────────────────────────────────────────────────

@router.get("/my-transactions")
def get_my_transactions(db=Depends(get_db)):
    """
    View all transactions where the current user is buyer or artist.

    NOTE: Requires auth to identify the user.
    """
    # TODO: Use get_current_user to get user_id
    raise HTTPException(
        status_code=501,
        detail="Requires auth implementation to identify the user."
    )
