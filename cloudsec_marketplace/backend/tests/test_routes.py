# /auth/register Tests
# * Test 1:     Test Register Route (Register new account)
# * Test 2:     Test Register Route (Create account with same email or username)

def test_register_route(client, user_payload):
    response = client.post("/auth/register", json=user_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["created"] is True

def test_register_route_duplicate(client, user_payload):
    first = client.post("/auth/register", json=user_payload)
    second = client.post("/auth/register", json=user_payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["created"] is False

# /auth/login Tests
# * Test 1:     Test Login Route (Invalid Login credentials fails)
# * Test 2:     Test Login Route (Invalid Login credentials passes)

def test_login_route_fail(client, registered_user):

    wrong_email = "wrongemail@example.com"
    login_response = client.post("/auth/login", json={
        "email": wrong_email,
        "password": registered_user["password"]
    })
    assert login_response.status_code == 401

    wrong_password = "wrongpassword"
    login_response = client.post("/auth/login", json={
        "email": registered_user["email"],
        "password": wrong_password
    })
    assert login_response.status_code == 401

def test_login_route_success(client, registered_user):
    response = client.post("/auth/login", json={
        "email": registered_user["email"],
        "password": registered_user["password"]
    })

    assert response.status_code == 200
    login_data = response.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"

# /auth/logout Tests
# * Test 1:     Test Logout Route (Logout success)

def test_logout_route_success(client, auth_headers):
    logout_response = client.post("/auth/logout", headers=auth_headers)

    assert logout_response.status_code == 200
    assert logout_response.json()["status"] == "logout_success"

# /user/me tests
# * Test 1: Check if we can view ourselves
# * Test 2: Check if we can delete ourselves
def test_get_me(client, registered_user, auth_headers):
    response = client.get("/user/me", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    
    assert data["username"] == registered_user["username"]
    assert data["email"] == registered_user["email"]
    assert "user_id" in data

def test_delete_user_account(client, auth_headers):
    response = client.delete("/user/me", headers=auth_headers)

    assert response.status_code == 200
    assert "deleted_user" in response.json()

# /user/me/settings tests
# * Test 1: Check if we can view our settings
# * Test 2: Check if we can update our settings (one item)
# * Test 3: Check if we can update our settings (no items)
# * Test 4: Check if we can update our settings (many items)
# * Test 5: Update username to existing username or email fail

def test_get_settings(client, registered_user, auth_headers):
    response =  client.get("/user/me/settings", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()

    assert data["username"] == registered_user["username"]
    assert data["email"] == registered_user["email"]
    assert data["pfp_path"] is None
    assert data["description"] is None

def test_change_settings_single(client, auth_headers):
    payload = {
        "pfp_path" : "new/path/image.png"
    }
    response = client.patch(
        "/user/me/settings",
        json=payload,
        headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["pfp_path"] == payload["pfp_path"]

def test_change_settings_none(client, registered_user, auth_headers):
    response = client.patch(
        "/user/me/settings",
        json={},
        headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == registered_user["username"]
    assert data["email"] == registered_user["email"]
    assert data["pfp_path"] is None
    assert data["description"] is None

def test_change_settings_many(client, auth_headers):
    payload = {
        "pfp_path" : "new/path/image.png",
        "description": "new description",
        "username": "newusername",
        "email": "newemail@example.com"
    }

    response = client.patch(
        "/user/me/settings",
        json=payload,
        headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "newusername"
    assert data["email"] == "newemail@example.com"
    assert data["pfp_path"] == "new/path/image.png"
    assert data["description"] == "new description"

def test_change_existing_user_info(client, auth_headers):

    # Create an existing user to try changing settings to
    other_user = {
        "username": "takenname",
        "email": "takenemail@example.com",
        "password": "password123!!"
    }

    register_response = client.post("/auth/register", json=other_user)
    assert register_response.status_code == 200
    assert register_response.json()["created"] is True


    # Test if we can update existing username
    response = client.patch(
        "/user/me/settings",
        json={"username": "takenname"},
        headers=auth_headers)
    
    assert response.status_code == 400

    # Test if we can update existing email
    response = client.patch(
        "/user/me/settings",
        json={"email": "takenemail@example.com"},
        headers=auth_headers)
    
    assert response.status_code == 400

# /user/me/images Tests
# * Test 1: Check if we can retrieve all the user images
# * Test 2: Check if we can get a single user image
# * Test 3: Check if we can delete a single user image
# * Test 4: Check if delete non-existing image fail

def test_get_user_images(client, user_images, registered_user, auth_headers):

    response = client.get("/user/me/images", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 2

    first = data[0]
    second = data[1]

    assert first["image_id"] == user_images[0]["image_id"]
    assert first["artist"]["user_id"] == registered_user["user_id"]

    assert second["image_id"] == user_images[1]["image_id"]
    assert second["artist"]["user_id"] == registered_user["user_id"]

def test_get_specific_image(client, user_images, registered_user, auth_headers):
    image_id = user_images[0]["image_id"]
    response = client.get(f"/user/me/images/{image_id}", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()

    assert data["image_id"] == image_id
    assert data["artist"]["user_id"] == registered_user["user_id"]

def test_delete_specific_image(client, user_images, auth_headers):
    image_id = user_images[0]["image_id"]
    response = client.delete(f"/user/me/images/{image_id}", headers=auth_headers)

    assert response.status_code == 200

    # Test to see if we can now get it
    delete_check = client.get(f"/user/me/images/{image_id}", headers=auth_headers)
    assert delete_check.status_code == 404

    data = response.json()
    assert data["deleted_image"] == image_id

def test_delete_image_not_found(client, auth_headers):
    image_id = "3f7a9b2c-6d4e-4a1f-8c2b-5e9d7f0a1b99"
    response = client.delete(f"/user/me/images/{image_id}", headers=auth_headers)

    assert response.status_code == 404

# /user/me/orders Tests
# * Test 1: Check if we can retrieve all the user orders
# * Test 2: Check if we can get a single user order
# * Test 3: Check if we can delete a single user order
# * Test 4: Check if delete non-existing order

def test_get_user_orders(client, user_orders, registered_user, auth_headers):

    response = client.get("/user/me/orders", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 2

    first = data[0]
    second = data[1]

    assert first["order_id"] == user_orders[0]["order_id"]
    assert first["client"]["user_id"] == registered_user["user_id"]

    assert second["order_id"] == user_orders[1]["order_id"]
    assert second["client"]["user_id"] == registered_user["user_id"]

def test_get_specific_order(client, user_orders, registered_user, auth_headers):
    order_id = user_orders[0]["order_id"]
    response = client.get(f"/user/me/orders/{order_id}", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()

    assert data["order_id"] == order_id
    assert data["client"]["user_id"] == registered_user["user_id"]

def test_delete_specific_order(client, user_orders, auth_headers):
    order_id = user_orders[0]["order_id"]
    response = client.delete(f"/user/me/orders/{order_id}", headers=auth_headers)

    assert response.status_code == 200

    # Test to see if we can now get it
    delete_check = client.get(f"/user/me/orders/{order_id}", headers=auth_headers)
    assert delete_check.status_code == 404

    data = response.json()
    assert data["deleted_order"] == order_id

def test_delete_order_not_found(client, auth_headers):
    order_id = "3f7a9b2c-6d4e-4a1f-8c2b-5e9d7f0a1b99"
    response = client.delete(f"/user/me/orders/{order_id}", headers=auth_headers)

    assert response.status_code == 404