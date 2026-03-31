import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client

# * The following are the list of route tests:

# /auth/register Tests
# * Test 1:     Test Register Route (Register new account)
# * Test 2:     Test Register Route (Delete my own account)
# * Test 3:     Test Register Route (Create account with same email or username)

# NOTE 1: Tests if we can actually register a user account
def test_register_route(client):
    response = client.post("/auth/register", json={
        "username": "testuser1",
        "email": "test1@example.com",
        "password": "password123!!"
    })

    assert response.status_code == 200
    data = response.json()

    assert data["created"] is True



# NOTE 2: Tests if we can delete our own account
def test_delete_user_account(client):
    payload = {
        "username": "testuser2",
        "email": "test2@example.com",
        "password": "password123!!"
    }

    # Create a new user
    register_response = client.post("/auth/register", json=payload)
    assert register_response.status_code == 200
    data = register_response.json()
    assert data["created"] is True

    # login as user
    login_response = client.post("/auth/login", json={
        "email": payload["email"],
        "password": payload["password"]
    })

    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"

    token = login_data["access_token"]

    # Delete self
    delete_response = client.delete(
        "/user/me",
        headers={"authorization": f"Bearer {token}"}
    )

    assert delete_response.status_code == 200
    assert "deleted_user" in delete_response.json()



# NOTE 3: Tests to see if a duplicate account that already exists will be made
def test_register_route_duplicate(client):
    payload = {
        "username": "testuser3",
        "email": "test3@example.com",
        "password": "password123!!"
    }

    first = client.post("/auth/register", json=payload)
    second = client.post("/auth/register", json=payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["created"] is False



# /auth/login Tests
# * Test 1:     Test Login Route (Invalid Login credentials fails)
# * Test 2:     Test Login Route (Invalid Login credentials passes)

def test_login_route_success(client):
    payload = {
        "username": "testuser4",
        "email": "test4@example.com",
        "password": "password123!!"
    }

    email = "test4@example.com"
    password = "password123!!"

    # Create a new user
    register_response = client.post("/auth/register", json=payload)
    assert register_response.status_code == 200
    data = register_response.json()
    assert data["created"] is True

    login_response = client.post("/auth/login", json={
        "email": email,
        "password": password
    })

    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"


def test_login_route_fail(client):
    payload = {
        "username": "testuser5",
        "email": "test5@example.com",
        "password": "password123!!"
    }

    # Create a new user
    register_response = client.post("/auth/register", json=payload)
    assert register_response.status_code == 200
    data = register_response.json()
    assert data["created"] is True

    wrong_email = "wrongemail@example.com"
    login_response = client.post("/auth/login", json={
        "email": wrong_email,
        "password": payload["password"]
    })
    assert login_response.status_code == 401

    wrong_password = "wrongpassword"
    login_response = client.post("/auth/login", json={
        "email": payload["email"],
        "password": wrong_password
    })
    assert login_response.status_code == 401

# /auth/logout Tests
# * Test 1:     Test Login Route (Logout success)
