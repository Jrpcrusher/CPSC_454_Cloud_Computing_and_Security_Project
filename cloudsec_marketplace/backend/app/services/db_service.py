from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from datetime import datetime, timezone
from fastapi import  HTTPException, UploadFile
from app.models.user import *
import uuid
import re
from watermark import watermark
from .s3_service import S3Service
import tempfile
import os
import shutil

################################################################
# Handling user accounts, view all, view one, create one, delete one
################################################################

ph = PasswordHasher()
s3_service = S3Service()

# user issues
def get_users(db):
    users = list(db["user"].find({}, {"_id": 0, "passwordHash": 0}))
    return [attach_pfp_url(user) for user in users]

def get_user(user_id, db):
    user = db["user"].find_one({"user_id": user_id}, {"_id": 0, "passwordHash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return attach_pfp_url(user)

def delete_user(user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # First delete the PFP of the user from S3
    pfp_key = user.get("pfp_key")
    if pfp_key:
        try:
            s3_service.delete_asset(pfp_key)
        except Exception:
            pass

    # Delete images in user profile from S3
    user_images = list(db["image"].find({"artist.user_id": user_id}, {"_id": 0}))
    for image in user_images:
        image_key = image.get("image_key")
        if image_key:
            try:
                s3_service.delete_asset(image_key)
            except Exception:
                pass

    # get a list of all the orders
    user_orders = list(
        db["order"].find(
            {
                "$or": [
                    {"client.user_id": user_id},
                    {"artist.user_id": user_id}
                ]
            }
        )
    )

    for order in user_orders:
        order_asset = db["order_asset"].find_one({"order_id": order["order_id"]}, {"_id": 0})
        if order_asset:
            for key_name in ("unwatermarked_key", "watermarked_key"):
                asset_key = order_asset.get(key_name)
                if asset_key:
                    try:
                        s3_service.delete_asset(asset_key)
                    except Exception:
                        pass
            db["order_asset"].delete_one({"order_id": order["order_id"]})

    # Delete the user from mongodb
    db["user"].delete_one({"user_id": user_id})
    # Delete orders associated with the user from mongodb
    db["order"].delete_many({
        "$or": [
            {"client.user_id": user_id},
            {"artist.user_id": user_id}
        ]
    })
    # Delete images from the user in mongodb
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
    
    images =  list(
        db["image"].find(
            {"artist.user_id": user_id},
            {"_id": 0}
        )
    )
    return [attach_image_url(image) for image in images]

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
    return attach_image_url(image)

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
    
    image_key = image.get("image_key")
    if image_key:
        try:
            s3_service.delete_asset(image_key)
        except Exception:
            pass
    
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
    
    order = attach_order_pfps(order)
    order = attach_order_asset_urls(order, db)
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
    user = db["user"].find_one({"username": request.username}) # try to find the user via email
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

    try:
        upload_file.file.seek(0)
        result = s3_service.upload_user_public_image(
            file_obj=upload_file.file,
            user_id=user_id,
            image_id=image_id,
            filename=upload_file.filename or f"{image_id}.png",
            content_type=upload_file.content_type or "image/png"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

    image = {
        "image_id": image_id,
        "image_key": result["key"],
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

    if result.matched_count == 0:
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

    # Decline the order first — this should always succeed
    result = db["order"].update_one(
        {
            "order_id": order_id,
            "artist.user_id": user_id
        },
        {"$set": {"status": "declined"}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=400, detail="Order not found or cannot be declined")

    # If there's an active transaction with held funds, refund the buyer
    active_txn = db["transaction"].find_one({
        "order_id": order_id,
        "status": {"$in": ["pending", "funds_held", "released"]},
    })
    if active_txn:
        try:
            from app.services.payment_service import refund_order
            refund_order(order_id, db)
        except Exception as e:
            # CRITICAL: Order is declined but refund failed — needs manual intervention.
            # Log the error but don't undo the decline; the artist's decision stands.
            import logging
            logging.getLogger(__name__).critical(
                f"REFUND FAILED on decline: order_id={order_id}, "
                f"transaction_id={active_txn.get('transaction_id')}, error={str(e)}"
            )

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
    
    unwatermarked_name = "unwatermarked.png"
    watermarked_name = "watermarked.png"

    original_result = None
    watermarked_result = None
    try:
        with tempfile.TemporaryDirectory() as tempdir:
            original_path = os.path.join(tempdir, "original_upload")
            watermarked_path = os.path.join(tempdir, "watermarked_output.png")
            watermark_local_path = os.path.join(tempdir, "watermark.png")

            upload_file.file.seek(0)
            with open(original_path, "wb") as f:
                shutil.copyfileobj(upload_file.file, f)

            s3_service.download_to_path(
                s3_service.get_private_watermark_key(),
                watermark_local_path
            )

            # make the watermarked version
            watermark.full_watermark(
                input_image_path=original_path,
                watermark_path=watermark_local_path,
                output_image_path=watermarked_path,
            )

            # Now upload the original
            with open(original_path, "rb") as original_file:
                original_result = s3_service.upload_order_image(
                    file_obj=original_file,
                    order_id=order_id,
                    file_name=unwatermarked_name,
                    content_type=upload_file.content_type or "image/png"
                )

            # Upload the watermarked version
            with open(watermarked_path, "rb") as watermarked_file:
                watermarked_result = s3_service.upload_order_image(
                    file_obj=watermarked_file,
                    order_id=order_id,
                    file_name=watermarked_name,
                    content_type=upload_file.content_type or "image/png"
                )
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image to order: {str(e)}")

    order_asset = {
        "order_id": order_id,
        "artist_id": order["artist"]["user_id"] ,
        "client_id": order["client"]["user_id"],
        "unwatermarked_key": original_result["key"],
        "watermarked_key": watermarked_result["key"], 
        "art_uploaded": True,
        "released_to_buyer": False
    }

    db["order_asset"].update_one(
        {"order_id": order_id},
        {"$set": order_asset},
        upsert=True
    )

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
    
    try:
        download_url = s3_service.get_presigned_download_url(
            order_asset["unwatermarked_key"],
            expires_in=300
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not generate download URL: {str(e)}")
    order_image = {
        "order_id": order_id,
        "unwatermarked_key": order_asset["unwatermarked_key"],
        "download_url": download_url
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
    
    try:
        upload_file.file.seek(0)
        result = s3_service.upload_pfp(
            file_obj=upload_file.file,
            user_id=user_id,
            filename="current.png",
            content_type=upload_file.content_type or "image/png"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload profile picture: {str(e)}")
    
    pfp_key = result["key"]

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

# Helper function attach pfp url
def attach_pfp_url(user_doc: dict) -> dict:
    if not user_doc:
        return user_doc
    
    user_copy = dict(user_doc)

    pfp_key = user_copy.get("pfp_key")
    if pfp_key:
        try:
            user_copy["pfp_url"] = s3_service.get_presigned_download_url(pfp_key)
        except Exception:
            user_copy["pfp_url"] = None
    else:
        user_copy["pfp_url"] = None
    return user_copy

def attach_image_url(image_doc: dict) -> dict:
    if not image_doc:
        return image_doc
    
    image_copy = dict(image_doc)

    image_key = image_copy.get("image_key")
    if image_key:
        try:
            image_copy["image_url"] = s3_service.get_presigned_download_url(image_key)
        except Exception:
            image_copy["image_url"] = None
    else:
        image_copy["image_url"] = None
    return image_copy

def attach_user_summary_pfp(user_summary: dict) -> dict:
    if not user_summary:
        return user_summary
    
    user_copy = dict(user_summary)

    pfp_key = user_copy.get("pfp_key")
    if pfp_key:
        try:
            user_copy["pfp_url"] = s3_service.get_presigned_download_url(pfp_key)
        except Exception:
            user_copy["pfp_url"] = None
    else:
        user_copy["pfp_url"] = None
    return user_copy

def attach_order_pfps(order_doc: dict) -> dict:
    if not order_doc:
        return order_doc
    
    order_copy = dict(order_doc)

    if order_copy.get("client"):
        order_copy["client"] = attach_user_summary_pfp(order_copy["client"])
    if order_copy.get("artist"):
        order_copy["artist"] = attach_user_summary_pfp(order_copy["artist"])

    return order_copy

def attach_order_asset_urls(order_doc: dict, db) -> dict:
    if not order_doc:
        return order_doc
    
    order_copy = dict(order_doc)

    order_asset = db["order_asset"].find_one(
        {"order_id": order_copy["order_id"]},
        {"_id": 0}
    )

    if not order_asset:
        order_copy["watermarked_key"] = None
        order_copy["watermarked_url"] = None
        order_copy["unwatermarked_key"] = None
        return order_copy
    
    order_copy["watermarked_key"] = order_asset.get("watermarked_key")
    order_copy["unwatermarked_key"] = order_asset.get("unwatermarked_key")

    watermarked_key = order_asset.get("watermarked_key")
    if watermarked_key:
        try:
            order_copy["watermarked_url"] = s3_service.get_presigned_download_url(
                watermarked_key,
                expires_in=300
            )
        except Exception:
            order_copy["watermarked_url"] = None
    else:
        order_copy["watermarked_url"] = None
    return order_copy