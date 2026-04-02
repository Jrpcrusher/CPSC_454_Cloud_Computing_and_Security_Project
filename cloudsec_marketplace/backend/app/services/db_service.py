from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from datetime import datetime, timezone
from fastapi import  HTTPException, UploadFile
from app.models.user import *
import uuid
import re
from pathlib import Path
from ...watermark import watermark

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
    return {"deleted_user": user["user_id"]}

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
    return {"deleted_image": image["image_id"]}

# order issues
def get_orders(user_id, role, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if role not in {"admin", "client", "artist"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    if role == "admin":
        return list(
            db["order"].find(
                {
                    "$or": [
                        {"artist.user_id": user_id},
                        {"client.user_id": user_id}
                    ]
                },
                {"_id": 0}
            )
        )

    query = {f"{role}.user_id": user_id}
    return list(
        db["order"].find(
            query,
            {"_id": 0}
        )
    )

def get_order(user_id, order_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    order = db["order"].find_one(
        {
            "order_id": order_id,
            "$or": [
                {"client.user_id": user_id},
                {"artist.user_id": user_id}
            ]
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
            "order_id": order_id,
            "$or": [
                {"client.user_id": user_id},
                {"artist.user_id": user_id}
            ]
        },
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"deleted_order": order["order_id"]}

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
        "pfp_key": None,
        "description": None,
        "passwordHash": ph.hash(user.password)
    }
    # Add the new user
    db["user"].insert_one(new_user)

    return {"created": True, "user_id": new_user["user_id"]}

def get_credentials(request, db):
    user = db["user"].find_one({"email": request.email}) # try to find the user via email
    if not user: # if the user doesnt exist, fail immediately
        return None
    try: # Try to verify password
        ph.verify(user["passwordHash"], request.password)
        return user
    except VerifyMismatchError: # If fail, login fail
        return None
        
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
        "pfp_key": client["pfp_key"]
    }

    artist_info = { # get the information about the artist
        "user_id": artist["user_id"],
        "username": artist["username"],
        "email": artist["email"],
        "pfp_key": artist["pfp_key"]
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
    user = db["user"].find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Artist not found")
    
    updated_settings = new_settings.model_dump(exclude_unset=True)

    if not updated_settings: # if nothing, then return the original stuff
        return {
            "username": user["username"],
            "email": user["email"],
            "pfp_key": user.get("pfp_key"),
            "description": user.get("description"),
        }
    
    # The following is a series of checks, for username, email, pfp, and description change

    if "username" in updated_settings: # check if username already exists, if so, give a vague error
        existing_username = db["user"].find_one({
            "username": updated_settings["username"],
            "user_id": {"$ne": user_id},
        })
        if existing_username:
            raise HTTPException(status_code=400, detail="Error occured, try another username")
        
    if "email" in updated_settings: # Check if the email is already in use, if so, give a vague error
        existing_email = db["user"].find_one({
            "email": updated_settings["email"],
            "user_id": {"$ne": user_id},
        })
        if existing_email:
            raise HTTPException(status_code=400, detail="Error occured, try another email")
        
    if updated_settings: # Actually update the settings
        db["user"].update_one(
            {"user_id": user_id},
            {"$set": updated_settings}
        )

    updated_user = db["user"].find_one({"user_id": user_id}, {"_id": 0}) # return the updated settings
    return updated_user

def upload_image(upload_file: UploadFile, description: str | None, user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    artist = { # get the information about the artist
        "user_id": user["user_id"],
        "username": user["username"],
        "email": user["email"],
        "pfp_key": user["pfp_key"]
    }

    image_id = str(uuid.uuid4())

    # ! TODO: Replace this when S3 functions are finished
    image_key = f"users/{user_id}/images/{image_id}_{upload_file.filename}"

    image = {
        "image_id": image_id,
        "image_key": image_key,
        "artist": artist,
        "upload_date": datetime.now(timezone.utc),
        "description": description
    }
    db["image"].insert_one(image)

    return image

def accept_order(order_id, user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user: # Make sure user exists
        raise HTTPException(status_code=404, detail="User not found")
    
    order = db["order"].find_one({"order_id": order_id})
    if not order: # Make sure order exists
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["artist"]["user_id"] != user_id: # Make sure the person is the artist
        raise HTTPException(status_code=403, detail="Not authorized")
    result = db["order"].update_one(
        {
            "order_id": order_id,
            "artist.user_id": user_id
        },
        {"$set": {"status": "accepted"}}
    )

    if result.match_count == 0:
        raise HTTPException(status_code=400, detail="Order not found or cannot be accepted")
    return {"status": "accepted"}

def decline_order(order_id, user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user: # Make sure user exists
        raise HTTPException(status_code=404, detail="User not found")
    
    order = db["order"].find_one({"order_id": order_id})
    if not order: # Make sure order exists
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["artist"]["user_id"] != user_id: # Make sure the person is the artist
        raise HTTPException(status_code=403, detail="Not authorized")
    result = db["order"].update_one(
        {
            "order_id": order_id,
            "artist.user_id": user_id
        },
        {"$set": {"status": "declined"}}
    )

    if result.match_count == 0:
        raise HTTPException(status_code=400, detail="Order not found or cannot be accepted")
    return {"status": "declined"}

def upload_order_image(upload_file: UploadFile, order_id, user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user: # Make sure order exists
        raise HTTPException(status_code=404, detail="User not found")
    order = db["order"].find_one({"order_id": order_id})
    if not order: # Make sure order exists
        raise HTTPException(status_code=404, detail="Order not found")

    if order["artist"]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the artist can upload artwork")
    
    if order["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Cannot upload to an unaccepted request")
    
    unwatermarked_key = f"orders/{order_id}/images/{order_id}_{upload_file.filename}" # ! TODO: Replace this when s3_service function is done
    watermarked_key = f"orders/{order_id}/images/{order_id}_{upload_file.filename}" # ! TODO: Replace this when s3_service function is done
    order_asset = {
        "order_id": order_id,
        "artist_id": order["artist"]["user_id"] ,
        "client_id": order["client"]["user_id"],
        "unwatermarked_key": unwatermarked_key,
        "watermarked_key": watermarked_key, 
        "art_uploaded": True,
        "released_to_buyer": False
    }

    existing = db["order_asset"].find_one({"order_id": order_id})
    if existing:
        db["order_asset"].update_one(
            {"order_id": order_id},
            {"$set": order_asset}
        )
    else:
        db["order_asset"].insert_one(order_asset)

    return order_asset

def download_image(order_id, user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user: # Make sure order exists
        raise HTTPException(status_code=404, detail="User not found")
    
    order = db["order"].find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order_asset = db["order_asset"].find_one({"order_id": order_id})

    if not order_asset: # Make sure order exists
        raise HTTPException(status_code=404, detail="Order asset not found")
    
    if order_asset["art_uploaded"] == False:
        raise HTTPException(status_code=404, detail="Art not uploaded or not found")
    
    if order_asset["released_to_buyer"] == False:
        raise HTTPException(status_code=403, detail="Not permitted to get art")
    
    if order_asset["client_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the client can download artwork")
    
    order_image = {
        "order_id": order_id,
        "unwatermarked_key": order_asset["unwatermarked_key"]
    }

    return order_image

def approve_order(order_id, user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user: # Make sure order exists
        raise HTTPException(status_code=404, detail="User not found")
    
    order = db["order"].find_one({"order_id": order_id})
    if not order: # Make sure order exists
        raise HTTPException(status_code=404, detail="Order not found")
    if order["status"] != "accepted": # Make sure order is accepted
        raise HTTPException(status_code=400, detail="Order not accepted")
    update_fields = {}

    if order["client"]["user_id"] == user_id: # Update if client
        if order.get("client_approval", False):
            raise HTTPException(status_code=400, detail="Client already approved!")
        update_fields["client_approval"] = True
    elif order["artist"]["user_id"] == user_id: # Update if artist
        if order.get("artist_approval", False):
            raise HTTPException(status_code=400, detail="Artist already approved!")
        update_fields["artist_approval"] = True
    else: # otherwise youre not allowed
        raise HTTPException(status_code=403, detail="Not authorized to approve.")
    
    db["order"].update_one(
        {"order_id": order_id},
        {"$set": update_fields}
    )
    updated = db["order"].find_one({"order_id": order_id}, {"_id": 0})

    return {
        "order_id": updated["order_id"],
        "client_approval": updated.get("client_approval", False),
        "artist_approval": updated.get("artist_approval", False)
    }

def release_image(order_id, user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user: # Make sure order exists
        raise HTTPException(status_code=404, detail="User not found")
    
    order = db["order"].find_one({"order_id": order_id})
    if not order: # Make sure order exists
        raise HTTPException(status_code=404, detail="Order not found")
    
    order_asset = db["order_asset"].find_one({"order_id": order_id})
    if not order_asset:
        raise HTTPException(status_code=404, detail="Image not found")
    
    if not order_asset.get("art_uploaded", False):
        raise HTTPException(status_code=400, detail="Art not uploaded")
    
    
    db["order_asset"].update_one(
        {"order_id": order_id},
        {"$set": {"released_to_buyer": True}}
    )

    db["order"].update_one(
        {"order_id": order_id},
        {"$set": {"status": "completed"}}
    )

    updated_order_asset = db["order_asset"].find_one({"order_id": order_id}, {"_id": 0})
    return updated_order_asset["unwatermarked_key"]
    
def upload_profile_picture(upload_file: UploadFile, user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user: # Make sure order exists
        raise HTTPException(status_code=404, detail="User not found")
    
    # ! TODO: Replace this when S3 is done and we can actually retrieve
    pfp_key = f"users/{user_id}/pfp/current.png"

    db["user"].update_one(
        {"user_id": user_id},
        {"$set": {"pfp_key": pfp_key}}
    )

    return {
        "username": user["username"],
        "email": user["email"],
        "pfp_key": pfp_key,
        "description": user["description"]
    }

################################################################