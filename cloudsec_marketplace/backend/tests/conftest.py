import pytest
import mongomock
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import create_access_token
from datetime import datetime, timezone
from uuid import uuid4

# Fixtures for tests so we don't repeat ourselves
@pytest.fixture(scope="session")
def test_db():
    mongo_client = mongomock.MongoClient()
    return mongo_client["test_db"]

@pytest.fixture(autouse=True)
def clear_database(test_db):
    test_db["user"].delete_many({})
    test_db["order"].delete_many({})
    test_db["transaction"].delete_many({})
    test_db["escrow_asset"].delete_many({})
    test_db["order_asset"].delete_many({})
    yield
    test_db["user"].delete_many({})
    test_db["order"].delete_many({})
    test_db["transaction"].delete_many({})
    test_db["escrow_asset"].delete_many({})
    test_db["order_asset"].delete_many({})

@pytest.fixture
def client(test_db):
    with TestClient(app) as client:
        client.app.database = test_db
        yield client

@pytest.fixture # Fix the payload information
def user_payload():
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123!!"
    }

@pytest.fixture # Fixture for when we register a user
def registered_user(client, user_payload):
    response = client.post("/auth/register", json=user_payload)
    data = response.json()

    return {
        **user_payload,
        "user_id": data["user_id"],
        "pfp_path": None
    }

@pytest.fixture # Fixture for getting the token
def auth_token(client, registered_user):
    response = client.post("/auth/login", json={
        "email": registered_user["email"],
        "password": registered_user["password"]
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    return data["access_token"]

@pytest.fixture # Fixture to add images to user
def user_images(test_db, registered_user):
    artist = {
        "user_id": registered_user["user_id"],
        "email": registered_user["email"],
        "username": registered_user["username"],
        "pfp_path": None
    }

    images = [
        {
            "image_id": "3f7a9b2c-6d4e-4a1f-8c2b-5e9d7f0a1b3c",
            "image_path": "path/image1.png",
            "artist": artist,
            "upload_date": datetime.now(timezone.utc),
            "description": ""

        },
        {
            "image_id": "3f7a9b2c-6d4e-4a1f-8c2b-5e9d7f0a1b3d",
            "image_path": "path/image2.png",
            "artist": artist,
            "upload_date": datetime.now(timezone.utc),
            "description": ""

        }
    ]
    test_db["image"].insert_many(images)
    return images

@pytest.fixture # Fixture to add images to user
def user_orders(test_db, registered_user):
    client = {
        "user_id": registered_user["user_id"],
        "email": registered_user["email"],
        "username": registered_user["username"],
        "pfp_path": None
    }

    artist = {
        "user_id": "3f7a9b2c-6d4e-4a1f-8c2b-5e9d7f0a1bdd",
        "email": "client@example.com",
        "username": "client",
        "pfp_path": None
    }

    orders = [
        {
            "order_id": "3f7a9b2c-6d4e-4a1f-8c2b-5e9d7f0a1b3c",
            "client": client,
            "artist": artist,
            "order_details": "",
            "creation_date": datetime.now(timezone.utc),
            "status": "received",
            "transaction_id": None

        },
        {
            "order_id": "3f7a9b2c-6d4e-4a1f-8c2b-5e9d7f0a1b3d",
            "client": client,
            "artist": artist,
            "order_details": "",
            "creation_date": datetime.now(timezone.utc),
            "status": "received",
            "transaction_id": None

        },
        {
            "order_id": "3f7a9b2c-6d4e-4a1f-8c2b-5e9d7f0a1b3e",
            "client": artist,
            "artist": client,
            "order_details": "",
            "creation_date": datetime.now(timezone.utc),
            "status": "received",
            "transaction_id": None
        },
        {
            "order_id": "3f7a9b2c-6d4e-4a1f-8c2b-5e9d7f0a1b3f",
            "client": artist,
            "artist": client,
            "order_details": "",
            "creation_date": datetime.now(timezone.utc),
            "status": "received",
            "transaction_id": None
        }
    ]
    test_db["order"].insert_many(orders)
    return orders

@pytest.fixture # fixture for authentication headers
def auth_headers(auth_token):
    return {"authorization": f"Bearer {auth_token}"}


# ═══════════════════════════════════════════════════════════════════════════
# Payment / Escrow Test Fixtures
# ═══════════════════════════════════════════════════════════════════════════

@pytest.fixture
def buyer_user(test_db):
    """A registered buyer user inserted directly into the DB."""
    user = {
        "user_id": str(uuid4()),
        "username": "buyer_user",
        "email": "buyer@example.com",
        "pfp_path": None,
        "pfp_key": None,
        "description": None,
        "role": "user",
    }
    test_db["user"].insert_one({**user, "passwordHash": "not_used_directly"})
    return user


@pytest.fixture
def artist_user(test_db):
    """A registered artist user with a Stripe Connect account."""
    user = {
        "user_id": str(uuid4()),
        "username": "artist_user",
        "email": "artist@example.com",
        "pfp_path": None,
        "pfp_key": None,
        "description": None,
        "role": "user",
        "stripe_account_id": "acct_test_artist_123",
    }
    test_db["user"].insert_one({**user, "passwordHash": "not_used_directly"})
    return user


@pytest.fixture
def stranger_user(test_db):
    """An unrelated user who is neither buyer nor artist on the test order."""
    user = {
        "user_id": str(uuid4()),
        "username": "stranger",
        "email": "stranger@example.com",
        "pfp_path": None,
        "pfp_key": None,
        "description": None,
        "role": "user",
    }
    test_db["user"].insert_one({**user, "passwordHash": "not_used_directly"})
    return user


@pytest.fixture
def buyer_headers(buyer_user):
    """Auth headers for the buyer user."""
    token = create_access_token({"user_id": buyer_user["user_id"]})
    return {"authorization": f"Bearer {token}"}


@pytest.fixture
def artist_headers(artist_user):
    """Auth headers for the artist user."""
    token = create_access_token({"user_id": artist_user["user_id"]})
    return {"authorization": f"Bearer {token}"}


@pytest.fixture
def stranger_headers(stranger_user):
    """Auth headers for an unrelated user."""
    token = create_access_token({"user_id": stranger_user["user_id"]})
    return {"authorization": f"Bearer {token}"}


@pytest.fixture
def test_order(test_db, buyer_user, artist_user):
    """An order in 'received' status between the buyer and artist."""
    order = {
        "order_id": str(uuid4()),
        "client": {
            "user_id": buyer_user["user_id"],
            "email": buyer_user["email"],
            "username": buyer_user["username"],
            "pfp_path": None,
        },
        "artist": {
            "user_id": artist_user["user_id"],
            "email": artist_user["email"],
            "username": artist_user["username"],
            "pfp_path": None,
        },
        "order_details": "Test commission",
        "creation_date": datetime.now(timezone.utc),
        "status": "received",
        "client_approval": False,
        "artist_approval": False,
        "transaction_id": None,
    }
    test_db["order"].insert_one(order)
    return order


@pytest.fixture
def mock_stripe():
    """
    Patches get_stripe_client so no real Stripe API calls are made.
    Returns the mock client object for assertions.
    """
    mock_client = MagicMock()

    # PaymentIntent.create returns a realistic-looking object
    mock_intent = MagicMock()
    mock_intent.id = "pi_test_123"
    mock_intent.client_secret = "pi_test_123_secret_abc"
    mock_intent.status = "requires_capture"
    mock_client.payment_intents.create.return_value = mock_intent

    # PaymentIntent.capture returns success
    mock_captured = MagicMock()
    mock_captured.id = "pi_test_123"
    mock_captured.status = "succeeded"
    mock_client.payment_intents.capture.return_value = mock_captured

    # PaymentIntent.cancel returns success
    mock_canceled = MagicMock()
    mock_canceled.id = "pi_test_123"
    mock_canceled.status = "canceled"
    mock_client.payment_intents.cancel.return_value = mock_canceled

    # Refund.create returns success
    mock_refund = MagicMock()
    mock_refund.id = "re_test_123"
    mock_client.refunds.create.return_value = mock_refund

    # Transfer.create returns success
    mock_transfer = MagicMock()
    mock_transfer.id = "tr_test_123"
    mock_client.transfers.create.return_value = mock_transfer

    # Webhook construct_event (for webhook tests)
    mock_client.webhooks.construct_event = MagicMock()

    with patch("app.services.payment_service.get_stripe_client", return_value=mock_client):
        yield mock_client


@pytest.fixture
def artist_no_stripe_user(test_db):
    """An artist user WITHOUT a Stripe Connect account."""
    user = {
        "user_id": str(uuid4()),
        "username": "artist_no_stripe",
        "email": "artist_nostripe@example.com",
        "pfp_path": None,
        "pfp_key": None,
        "description": None,
        "role": "user",
    }
    test_db["user"].insert_one({**user, "passwordHash": "not_used_directly"})
    return user


@pytest.fixture
def artist_no_stripe_headers(artist_no_stripe_user):
    """Auth headers for an artist without Stripe."""
    token = create_access_token({"user_id": artist_no_stripe_user["user_id"]})
    return {"authorization": f"Bearer {token}"}


@pytest.fixture
def accepted_order(test_db, buyer_user, artist_user):
    """An order in 'accepted' status between the buyer and artist."""
    order = {
        "order_id": str(uuid4()),
        "client": {
            "user_id": buyer_user["user_id"],
            "email": buyer_user["email"],
            "username": buyer_user["username"],
            "pfp_key": None,
        },
        "artist": {
            "user_id": artist_user["user_id"],
            "email": artist_user["email"],
            "username": artist_user["username"],
            "pfp_key": None,
        },
        "order_details": "Test commission",
        "creation_date": datetime.now(timezone.utc),
        "status": "accepted",
        "client_approval": False,
        "artist_approval": False,
        "transaction_id": None,
    }
    test_db["order"].insert_one(order)
    return order