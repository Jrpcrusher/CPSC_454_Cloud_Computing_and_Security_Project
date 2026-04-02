import pytest
import mongomock
from fastapi.testclient import TestClient
from app.main import app
from datetime import datetime, timezone

# Fixtures for tests so we don't repeat ourselves
@pytest.fixture(scope="session")
def test_db():
    mongo_client = mongomock.MongoClient()
    return mongo_client["test_db"]

@pytest.fixture(autouse=True)
def clear_database(test_db):
    test_db["user"].delete_many({})
    yield
    test_db["user"].delete_many({})

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