"""
Payment Escrow State Machine Tests

Tests the full payment lifecycle:
  pending → funds_held → released → payout_sent
  with branches for: canceled, failed, refunded

All Stripe API calls are mocked via the mock_stripe fixture.
"""

import pytest
from unittest.mock import patch, MagicMock, call
from datetime import datetime, timezone
from uuid import uuid4

from app.services import payment_service


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

def _create_transaction(test_db, order_id, buyer_id, artist_id, status="pending",
                        pi_id="pi_test_123", amount=2500):
    """Insert a transaction document directly into the DB for testing."""
    txn = {
        "transaction_id": str(uuid4()),
        "order_id": order_id,
        "buyer_id": buyer_id,
        "artist_id": artist_id,
        "amount": amount,
        "currency": "usd",
        "stripe_payment_intent_id": pi_id,
        "stripe_payout_id": None,
        "status": status,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    test_db["transaction"].insert_one(txn)
    return txn


def _create_escrow_asset(test_db, order_id, released=False):
    """Insert an escrow_asset document directly into the DB for testing."""
    asset = {
        "order_id": order_id,
        "s3_watermarked_path": f"watermarked/{order_id}.png",
        "s3_unwatermarked_path": f"unwatermarked/{order_id}.png",
        "unwatermarked_uploaded": True,
        "released_to_buyer": released,
        "uploaded_at": datetime.utcnow().isoformat(),
    }
    test_db["escrow_asset"].insert_one(asset)
    return asset


# ═══════════════════════════════════════════════════════════════════════════
# PaymentIntent Creation
# ═══════════════════════════════════════════════════════════════════════════

def test_create_payment_intent_success(client, test_db, test_order, buyer_headers, mock_stripe):
    """Buyer creates PaymentIntent for order in 'received' status."""
    response = client.post("/payments/create-intent", json={
        "order_id": test_order["order_id"],
        "amount": 2500,
        "currency": "usd",
    }, headers=buyer_headers)

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"
    data = response.json()

    # Response contains expected fields
    assert "client_secret" in data, "Response should contain client_secret"
    assert "transaction_id" in data, "Response should contain transaction_id"
    assert "stripe_payment_intent_id" in data, "Response should contain stripe_payment_intent_id"
    assert data["client_secret"] == "pi_test_123_secret_abc"
    assert data["stripe_payment_intent_id"] == "pi_test_123"

    # Transaction was created in the DB with pending status
    txn = test_db["transaction"].find_one({"order_id": test_order["order_id"]})
    assert txn is not None, "Transaction should be created in DB"
    assert txn["status"] == "pending", "New transaction should be in 'pending' status"
    assert txn["amount"] == 2500
    assert txn["buyer_id"] == test_order["client"]["user_id"]
    assert txn["artist_id"] == test_order["artist"]["user_id"]

    # Order should have transaction_id linked back
    order = test_db["order"].find_one({"order_id": test_order["order_id"]})
    assert order["transaction_id"] == txn["transaction_id"], "Order should link to transaction"

    # Stripe was called with manual capture
    mock_stripe.payment_intents.create.assert_called_once()
    call_params = mock_stripe.payment_intents.create.call_args
    assert call_params.kwargs["params"]["capture_method"] == "manual"


def test_create_payment_intent_not_buyer(client, test_order, artist_headers, mock_stripe):
    """Non-buyer (artist) should get 403 when trying to create payment."""
    response = client.post("/payments/create-intent", json={
        "order_id": test_order["order_id"],
        "amount": 2500,
    }, headers=artist_headers)

    assert response.status_code == 403, f"Expected 403 for non-buyer, got {response.status_code}"


def test_create_payment_intent_wrong_order_status(client, test_db, test_order, buyer_headers, mock_stripe):
    """Order not in 'received' status should be rejected."""
    # Move order to 'completed'
    test_db["order"].update_one(
        {"order_id": test_order["order_id"]},
        {"$set": {"status": "completed"}},
    )

    response = client.post("/payments/create-intent", json={
        "order_id": test_order["order_id"],
        "amount": 2500,
    }, headers=buyer_headers)

    assert response.status_code == 400, f"Expected 400 for wrong status, got {response.status_code}"
    assert "received" in response.json()["detail"].lower()


def test_create_payment_intent_duplicate(client, test_db, test_order, buyer_headers, mock_stripe):
    """Order already has an active transaction → should be rejected."""
    _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="pending",
    )

    response = client.post("/payments/create-intent", json={
        "order_id": test_order["order_id"],
        "amount": 2500,
    }, headers=buyer_headers)

    assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
    assert "active transaction" in response.json()["detail"].lower()


# ═══════════════════════════════════════════════════════════════════════════
# Webhook: authorized (pending → funds_held)
# ═══════════════════════════════════════════════════════════════════════════

def test_webhook_authorized(test_db, test_order, mock_stripe):
    """payment_intent.amount_capturable_updated moves transaction to funds_held."""
    txn = _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="pending",
    )

    # Call the service function directly (webhook routing is tested via the route)
    payment_intent = {"id": txn["stripe_payment_intent_id"]}
    payment_service.handle_payment_intent_authorized(payment_intent, test_db)

    # Transaction should move to funds_held
    updated_txn = test_db["transaction"].find_one({"transaction_id": txn["transaction_id"]})
    assert updated_txn["status"] == "funds_held", "Transaction should move to 'funds_held'"

    # Order status should NOT be changed by the authorized handler
    order = test_db["order"].find_one({"order_id": test_order["order_id"]})
    assert order["status"] == "received", "Order status should NOT change on authorization"


# ═══════════════════════════════════════════════════════════════════════════
# Webhook: succeeded race guard
# ═══════════════════════════════════════════════════════════════════════════

def test_webhook_succeeded_normal(test_db, test_order, mock_stripe):
    """payment_intent.succeeded moves transaction to 'released' when in valid state."""
    txn = _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="funds_held",
    )

    payment_intent = {"id": txn["stripe_payment_intent_id"]}
    payment_service.handle_payment_intent_succeeded(payment_intent, test_db)

    updated_txn = test_db["transaction"].find_one({"transaction_id": txn["transaction_id"]})
    assert updated_txn["status"] == "released", "Transaction should move to 'released'"


def test_webhook_succeeded_already_released(test_db, test_order, mock_stripe):
    """Transaction already at 'payout_sent' should NOT be clobbered back to 'released'."""
    txn = _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="payout_sent",
    )

    payment_intent = {"id": txn["stripe_payment_intent_id"]}
    payment_service.handle_payment_intent_succeeded(payment_intent, test_db)

    updated_txn = test_db["transaction"].find_one({"transaction_id": txn["transaction_id"]})
    assert updated_txn["status"] == "payout_sent", \
        "Transaction at 'payout_sent' should NOT be clobbered back to 'released'"


# ═══════════════════════════════════════════════════════════════════════════
# Webhook: canceled vs failed
# ═══════════════════════════════════════════════════════════════════════════

def test_webhook_canceled(test_db, test_order, mock_stripe):
    """payment_intent.canceled sets transaction to 'canceled', NOT 'failed'."""
    txn = _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="pending",
    )

    payment_intent = {"id": txn["stripe_payment_intent_id"]}
    payment_service.handle_payment_intent_canceled(payment_intent, test_db)

    updated_txn = test_db["transaction"].find_one({"transaction_id": txn["transaction_id"]})
    assert updated_txn["status"] == "canceled", \
        "Canceled webhook should set status to 'canceled', not 'failed'"

    # Order status should NOT be changed by the canceled handler
    order = test_db["order"].find_one({"order_id": test_order["order_id"]})
    assert order["status"] == "received", \
        "Order status should NOT change on payment_intent.canceled"


def test_webhook_failed(test_db, test_order, mock_stripe):
    """payment_intent.payment_failed sets transaction to 'failed' and order to 'declined'."""
    txn = _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="pending",
    )

    payment_intent = {"id": txn["stripe_payment_intent_id"]}
    payment_service.handle_payment_intent_failed(payment_intent, test_db)

    updated_txn = test_db["transaction"].find_one({"transaction_id": txn["transaction_id"]})
    assert updated_txn["status"] == "failed", "Failed webhook should set status to 'failed'"

    order = test_db["order"].find_one({"order_id": test_order["order_id"]})
    assert order["status"] == "declined", "Failed payment should set order to 'declined'"


# ═══════════════════════════════════════════════════════════════════════════
# Refund
# ═══════════════════════════════════════════════════════════════════════════

def test_refund_uncaptured(client, test_db, test_order, buyer_headers, mock_stripe):
    """Refund on 'funds_held' → cancels PI, status becomes 'canceled', order → 'declined'."""
    _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="funds_held",
    )

    response = client.post(
        f"/payments/{test_order['order_id']}/refund",
        headers=buyer_headers,
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"

    # Stripe should have canceled the PI (not created a refund)
    mock_stripe.payment_intents.cancel.assert_called_once()
    mock_stripe.refunds.create.assert_not_called()

    # Transaction → canceled
    txn = test_db["transaction"].find_one({"order_id": test_order["order_id"]})
    assert txn["status"] == "canceled", "Uncaptured refund should set status to 'canceled'"

    # Order → declined
    order = test_db["order"].find_one({"order_id": test_order["order_id"]})
    assert order["status"] == "declined", "Refund should set order to 'declined'"


def test_refund_captured(client, test_db, test_order, buyer_headers, mock_stripe):
    """Refund on captured ('released') transaction → issues Stripe refund, status → 'refunded'."""
    _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="released",
    )

    response = client.post(
        f"/payments/{test_order['order_id']}/refund",
        headers=buyer_headers,
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"

    # Stripe should have created a refund (not canceled the PI)
    mock_stripe.refunds.create.assert_called_once()
    mock_stripe.payment_intents.cancel.assert_not_called()

    # Transaction → refunded
    txn = test_db["transaction"].find_one({"order_id": test_order["order_id"]})
    assert txn["status"] == "refunded", "Captured refund should set status to 'refunded'"


def test_refund_not_buyer(client, test_db, test_order, artist_headers, mock_stripe):
    """Non-buyer (artist) should get 403 when trying to refund."""
    _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="funds_held",
    )

    response = client.post(
        f"/payments/{test_order['order_id']}/refund",
        headers=artist_headers,
    )

    assert response.status_code == 403, f"Expected 403 for non-buyer refund, got {response.status_code}"


# ═══════════════════════════════════════════════════════════════════════════
# Decline triggers refund
# ═══════════════════════════════════════════════════════════════════════════

def test_decline_order_refunds_held_funds(client, test_db, test_order, artist_user, artist_headers, mock_stripe):
    """Artist declines order with 'funds_held' transaction → funds are refunded."""
    _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=artist_user["user_id"],
        status="funds_held",
    )

    response = client.patch(
        f"/user/me/orders/{test_order['order_id']}/decline",
        headers=artist_headers,
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"

    # Order should be declined
    order = test_db["order"].find_one({"order_id": test_order["order_id"]})
    assert order["status"] == "declined", "Order should be declined"

    # Transaction should be canceled (funds_held → cancel PI)
    txn = test_db["transaction"].find_one({"order_id": test_order["order_id"]})
    assert txn["status"] == "canceled", \
        "Declining with held funds should cancel the transaction"

    # Stripe PI cancel should have been called
    mock_stripe.payment_intents.cancel.assert_called_once()


# ═══════════════════════════════════════════════════════════════════════════
# Escrow
# ═══════════════════════════════════════════════════════════════════════════

def test_check_escrow_not_ready_missing_approval(test_db, test_order, mock_stripe):
    """Funds held + art uploaded but client hasn't approved → not ready."""
    _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="funds_held",
    )
    _create_escrow_asset(test_db, test_order["order_id"])

    # Only artist approved, client has NOT approved
    test_db["order"].update_one(
        {"order_id": test_order["order_id"]},
        {"$set": {"artist_approval": True, "client_approval": False}},
    )

    result = payment_service.check_escrow_ready(test_order["order_id"], test_db)
    assert result is False, "Escrow should NOT be ready without client approval"

    # Transaction should still be funds_held (not released)
    txn = test_db["transaction"].find_one({"order_id": test_order["order_id"]})
    assert txn["status"] == "funds_held", "Transaction should remain 'funds_held'"


def test_check_escrow_ready_all_conditions(test_db, test_order, mock_stripe):
    """All 4 conditions met → escrow releases."""
    txn = _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="funds_held",
    )
    _create_escrow_asset(test_db, test_order["order_id"])

    # Set both approvals
    test_db["order"].update_one(
        {"order_id": test_order["order_id"]},
        {"$set": {"client_approval": True, "artist_approval": True}},
    )

    result = payment_service.check_escrow_ready(test_order["order_id"], test_db)
    assert result is True, "Escrow should be ready when all 4 conditions are met"

    # Stripe capture should have been called
    mock_stripe.payment_intents.capture.assert_called_once_with(txn["stripe_payment_intent_id"])

    # Order should be completed
    order = test_db["order"].find_one({"order_id": test_order["order_id"]})
    assert order["status"] == "completed", "Order should be 'completed' after escrow release"

    # Art should be released to buyer
    asset = test_db["escrow_asset"].find_one({"order_id": test_order["order_id"]})
    assert asset["released_to_buyer"] is True, "Art should be released to buyer"


def test_escrow_release_atomic_no_double_execute(test_db, test_order, mock_stripe):
    """Calling release twice → second call is a no-op (atomic claim prevents double execution)."""
    txn = _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="funds_held",
    )
    _create_escrow_asset(test_db, test_order["order_id"])

    test_db["order"].update_one(
        {"order_id": test_order["order_id"]},
        {"$set": {"client_approval": True, "artist_approval": True}},
    )

    # First release — should succeed
    payment_service.execute_escrow_release(test_order["order_id"], txn, test_db)
    assert mock_stripe.payment_intents.capture.call_count == 1, \
        "First release should capture the payment"

    # Second release — should be a no-op (transaction no longer in funds_held)
    payment_service.execute_escrow_release(test_order["order_id"], txn, test_db)
    assert mock_stripe.payment_intents.capture.call_count == 1, \
        "Second release should be a no-op — capture should NOT be called again"


# ═══════════════════════════════════════════════════════════════════════════
# Escrow release ordering
# ═══════════════════════════════════════════════════════════════════════════

def test_escrow_release_order(test_db, test_order, artist_user, mock_stripe):
    """Verify release order: capture → released → payout → completed → art released."""
    txn = _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=artist_user["user_id"],
        status="funds_held",
    )
    _create_escrow_asset(test_db, test_order["order_id"])

    test_db["order"].update_one(
        {"order_id": test_order["order_id"]},
        {"$set": {"client_approval": True, "artist_approval": True}},
    )

    # Track the order of Stripe calls using side_effect with return values
    call_order = []

    mock_captured = MagicMock()
    mock_captured.id = "pi_test_123"
    mock_captured.status = "succeeded"

    mock_transfer = MagicMock()
    mock_transfer.id = "tr_test_123"

    def track_capture(*a, **kw):
        call_order.append("capture")
        return mock_captured

    def track_transfer(*a, **kw):
        call_order.append("transfer")
        return mock_transfer

    mock_stripe.payment_intents.capture.side_effect = track_capture
    mock_stripe.transfers.create.side_effect = track_transfer

    payment_service.execute_escrow_release(test_order["order_id"], txn, test_db)

    # Verify capture happened before transfer
    assert call_order == ["capture", "transfer"], \
        f"Expected capture then transfer, got: {call_order}"

    # Verify final DB state
    final_txn = test_db["transaction"].find_one({"transaction_id": txn["transaction_id"]})
    assert final_txn["status"] == "payout_sent", "Transaction should be 'payout_sent'"

    order = test_db["order"].find_one({"order_id": test_order["order_id"]})
    assert order["status"] == "completed", "Order should be 'completed'"

    asset = test_db["escrow_asset"].find_one({"order_id": test_order["order_id"]})
    assert asset["released_to_buyer"] is True, "Art should be released to buyer"


# ═══════════════════════════════════════════════════════════════════════════
# Payout
# ═══════════════════════════════════════════════════════════════════════════

def test_payout_success(test_db, test_order, artist_user, mock_stripe):
    """Transfer created successfully, transaction moves to 'payout_sent'."""
    txn = _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=artist_user["user_id"],
        status="released",
        amount=2500,
    )

    payment_service.payout_artist(test_order["order_id"], txn, test_db)

    # Stripe transfer was called
    mock_stripe.transfers.create.assert_called_once()
    call_params = mock_stripe.transfers.create.call_args.kwargs["params"]
    assert call_params["destination"] == artist_user["stripe_account_id"]

    # Transaction updated
    updated_txn = test_db["transaction"].find_one({"transaction_id": txn["transaction_id"]})
    assert updated_txn["status"] == "payout_sent", "Transaction should be 'payout_sent'"
    assert updated_txn["stripe_payout_id"] == "tr_test_123"
    assert updated_txn.get("payout_attempts", 0) >= 1, "payout_attempts should be incremented"


def test_payout_no_stripe_account(test_db, test_order, mock_stripe):
    """Artist has no stripe_account_id → raises error, transaction NOT moved to payout_sent."""
    # Create an artist WITHOUT stripe_account_id
    no_stripe_artist_id = str(uuid4())
    test_db["user"].insert_one({
        "user_id": no_stripe_artist_id,
        "username": "no_stripe_artist",
        "email": "nostripe@example.com",
        "pfp_path": None,
        "pfp_key": None,
        "description": None,
        "role": "user",
        # No stripe_account_id!
    })

    txn = _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=no_stripe_artist_id,
        status="released",
    )

    with pytest.raises(Exception) as exc_info:
        payment_service.payout_artist(test_order["order_id"], txn, test_db)

    assert "onboarding" in str(exc_info.value.detail).lower() or \
           "stripe connect" in str(exc_info.value.detail).lower(), \
        "Error should mention Stripe Connect onboarding"

    # Transaction should NOT have moved to payout_sent
    updated_txn = test_db["transaction"].find_one({"transaction_id": txn["transaction_id"]})
    assert updated_txn["status"] == "released", \
        "Transaction should stay at 'released' when payout fails"

    # payout_attempts should be incremented
    assert updated_txn.get("payout_attempts", 0) >= 1, \
        "payout_attempts should be incremented even on failure"

    # Stripe transfer should NOT have been called
    mock_stripe.transfers.create.assert_not_called()


def test_payout_stripe_error(test_db, test_order, artist_user, mock_stripe):
    """Stripe transfer API fails → raises error, transaction stays 'released', attempts incremented."""
    import stripe as stripe_module

    txn = _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=artist_user["user_id"],
        status="released",
    )

    # Make transfer fail
    mock_stripe.transfers.create.side_effect = stripe_module.StripeError("Transfer failed")

    with pytest.raises(Exception):
        payment_service.payout_artist(test_order["order_id"], txn, test_db)

    # Transaction should stay at 'released'
    updated_txn = test_db["transaction"].find_one({"transaction_id": txn["transaction_id"]})
    assert updated_txn["status"] == "released", \
        "Transaction should stay at 'released' when Stripe transfer fails"

    # payout_attempts should be incremented
    assert updated_txn.get("payout_attempts", 0) >= 1, \
        "payout_attempts should be incremented on Stripe error"

    # payout_note should record the error
    assert updated_txn.get("payout_note") is not None, \
        "payout_note should record the failure reason"


# ═══════════════════════════════════════════════════════════════════════════
# Auth guards
# ═══════════════════════════════════════════════════════════════════════════

def test_status_route_buyer_can_view(client, test_db, test_order, buyer_headers, mock_stripe):
    """Buyer can view transaction status for their order."""
    _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="pending",
    )

    response = client.get(
        f"/payments/{test_order['order_id']}/status",
        headers=buyer_headers,
    )

    assert response.status_code == 200, f"Buyer should be able to view status, got {response.status_code}"
    data = response.json()
    assert data["status"] == "pending"


def test_status_route_artist_can_view(client, test_db, test_order, artist_headers, mock_stripe):
    """Artist can view transaction status for their order."""
    _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="funds_held",
    )

    response = client.get(
        f"/payments/{test_order['order_id']}/status",
        headers=artist_headers,
    )

    assert response.status_code == 200, f"Artist should be able to view status, got {response.status_code}"
    data = response.json()
    assert data["status"] == "funds_held"


def test_status_route_stranger_forbidden(client, test_db, test_order, stranger_headers, mock_stripe):
    """Unrelated user gets 403 when checking status."""
    _create_transaction(
        test_db,
        order_id=test_order["order_id"],
        buyer_id=test_order["client"]["user_id"],
        artist_id=test_order["artist"]["user_id"],
        status="pending",
    )

    response = client.get(
        f"/payments/{test_order['order_id']}/status",
        headers=stranger_headers,
    )

    assert response.status_code == 403, f"Stranger should get 403, got {response.status_code}"


# ═══════════════════════════════════════════════════════════════════════════
# Download guard
# ═══════════════════════════════════════════════════════════════════════════

def test_download_requires_completed_order(client, test_db, test_order, buyer_headers, mock_stripe):
    """Download rejected if order is not in 'completed' status."""
    # Create released escrow asset but order is still 'received'
    _create_escrow_asset(test_db, test_order["order_id"], released=True)

    response = client.get(
        f"/payments/{test_order['order_id']}/download",
        headers=buyer_headers,
    )

    assert response.status_code == 403, \
        f"Download should be rejected for non-completed order, got {response.status_code}"


def test_download_buyer_only(client, test_db, test_order, artist_headers, mock_stripe):
    """Non-buyer (artist) gets 403 when trying to download."""
    _create_escrow_asset(test_db, test_order["order_id"], released=True)

    test_db["order"].update_one(
        {"order_id": test_order["order_id"]},
        {"$set": {"status": "completed"}},
    )

    response = client.get(
        f"/payments/{test_order['order_id']}/download",
        headers=artist_headers,
    )

    assert response.status_code == 403, \
        f"Artist should get 403 for download, got {response.status_code}"
