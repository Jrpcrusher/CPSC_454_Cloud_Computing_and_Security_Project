from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum


class TransactionStatus(str, Enum):
    pending = "pending"                 # Payment intent created, awaiting buyer confirmation
    funds_held = "funds_held"           # Funds authorized & held by platform (escrow active)
    released = "released"               # Escrow completed — funds captured by platform
    payout_sent = "payout_sent"         # Artist has been paid out
    failed = "failed"                   # Payment failed
    refunded = "refunded"               # Buyer was refunded
    canceled = "canceled"               # Payment intent was canceled / expired


class Transaction(BaseModel):
    """Tracks the financial side of an order — separate from the commission workflow."""
    transaction_id: UUID = Field(default_factory=uuid4)
    order_id: UUID                                          # Links to the Order
    buyer_id: UUID                                          # Who is paying
    artist_id: UUID                                         # Who gets paid
    amount: int                                             # Amount in cents (e.g. 2500 = $25.00)
    currency: str = "usd"                                   # ISO currency code
    stripe_payment_intent_id: str                           # Stripe PaymentIntent ID (pi_xxx)
    stripe_payout_id: str | None = None                     # Stripe Transfer ID (set after payout)
    status: TransactionStatus = TransactionStatus.pending
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CreatePaymentRequest(BaseModel):
    """Request body when a buyer initiates payment for an order."""
    order_id: UUID
    amount: int = Field(gt=0, description="Amount in cents (e.g. 2500 = $25.00)")
    currency: str = "usd"


class PaymentIntentResponse(BaseModel):
    """Returned to frontend so the buyer can confirm payment."""
    client_secret: str                  # Stripe client_secret for the PaymentIntent
    transaction_id: UUID
    stripe_payment_intent_id: str


class TransactionStatusResponse(BaseModel):
    """Public view of a transaction's current state."""
    transaction_id: UUID
    order_id: UUID
    amount: int
    currency: str
    status: TransactionStatus
    created_at: datetime
    updated_at: datetime
