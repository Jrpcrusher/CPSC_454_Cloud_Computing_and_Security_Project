from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from datetime import datetime, timezone
from fastapi import  HTTPException
from app.models.user import *
import uuid
import re

################################################################
# Handling user accounts, view all, view one, create one, delete one
################################################################

ph = PasswordHasher()

# user issues
def get_users(db):
    users = list(db["user"].find({}, {"_id": 0, "passwordHash": 0}))
    return users

def get_user(user_id, db):
    user = db["user"].find_one({"user_id": user_id}, {"_id": 0, "passwordHash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def delete_user(user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db["user"].delete_one({"user_id": user_id})
    db["order"].delete_many({
        "$or": [
            {"client.user_id": user_id},
            {"artist.user_id": user_id}
        ]
    })
    db["image"].delete_many({"artist.user_id": user_id})
    return {"deleted user": user["user_id"]}

def view_permissions(user_id, db):
    user = db["user"].find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"role": user["role"], "username": user["username"]}

def toggle_permission(user_id, db):
    user = db["user"].find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_role = UserRole.admin if user["role"] == UserRole.user else UserRole.user

    db["user"].update_one(
        {"user_id": user_id},
        {"$set": {"role": updated_role}}
    )
    return {"username": user["username"], "role": updated_role}

# image issues
def get_images(user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return list(
        db["image"].find(
            {"artist.user_id": user_id},
            {"_id": 0}
        )
    )

def get_image(user_id, image_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    image = db["image"].find_one(
        {
            "artist.user_id": user_id,
            "image_id": image_id
        },
        {"_id": 0}
    )

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return image

def delete_image(user_id, image_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    image = db["image"].find_one_and_delete(
        {
            "artist.user_id": user_id,
            "image_id": image_id
        },
        {"_id": 0}
    )
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"deleted image": image["image_id"]}

# order issues
def get_orders(user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return list(
        db["order"].find(
            {"client.user_id": user_id},
            {"_id": 0}
        )
    )

def get_order(user_id, order_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    order = db["order"].find_one(
        {
            "client.user_id": user_id,
            "order_id": order_id
        },
        {"_id": 0}
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

def delete_order(user_id, order_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    order = db["order"].find_one_and_delete(
        {
            "client.user_id": user_id,
            "order_id": order_id
        },
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"deleted order": order["order_id"]}

def create_user(user, db):
    # Check if the username already exists and email
    check = db["user"].find_one({"$or": [
        {"username": user.username},
        {"email": user.email}
        ]
    })
    if check:
        return {"created": False, "error": "Username or email already in use"}

    # Create the new user
    new_user = {
        "user_id": str(uuid.uuid4()),
        "username": user.username,
        "email": user.email,
        "register_date": datetime.now(timezone.utc),
        "role": UserRole.user,
        "pfp_path": None,
        "description": None,
        "passwordHash": ph.hash(user.password)
    }
    # Add the new user
    db["user"].insert_one(new_user)

    return {"created": True, "user_id": new_user["user_id"]}

def get_credentials(request, db):
    user = db["user"].find_one({"email": request.email}) # try to find the user via email
    if not user: # if the user doesnt exist, fail immediately
        return 0
    try: # Try to verify password
        ph.verify(user["passwordHash"], request.password)
        return 1
    except VerifyMismatchError: # If fail, login fail
        return 0
        
def search_users(query, db, include_private: bool = False):
    safe_query = re.escape(query)

    projection = {"passwordHash": 0, "_id": 0}
    if not include_private:
        projection["email"] = 0

    result = list(
        db["user"].find(
            {"username": {"$regex": safe_query, "$options": "i"}},
            projection,
        ).limit(30)
    )

    return result

def create_order(artist_id : str, client_id : str, order_object, db):
    artist = db["user"].find_one({"user_id": artist_id})
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    
    client = db["user"].find_one({"user_id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client_id == artist_id:
        raise HTTPException(status_code=400, detail="You cannot order from yourself!")

    client_info = { # get information about the requester
        "user_id": client["user_id"],
        "username": client["username"],
        "email": client["email"],
        "pfp_path": client["pfp_path"]
    }

    artist_info = { # get the information about the artist
        "user_id": artist["user_id"],
        "username": artist["username"],
        "email": artist["email"],
        "pfp_path": artist["pfp_path"]
    }

    order = {
        "order_id": str(uuid.uuid4()),
        "client": client_info,
        "artist": artist_info,
        "order_details": order_object.order_details,
        "creation_date": datetime.now(timezone.utc),
        "status": "received",
        "transaction_id": None,
    }
    db["order"].insert_one(order)

    return order

def change_settings(user_id, new_settings, db):
    return None
################################################################