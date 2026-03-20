from bson import ObjectId
from bson.errors import InvalidId
from fastapi import  HTTPException
from app.models.user import *

################################################################
# Handling user accounts, view all, view one, create one, delete one
################################################################

# user issues
def get_users(db):
    users = list(db["user"].find({}, {"_id": 0}))
    # TODO: add validation later
    return users

def get_user(user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    # TODO: add validation later
    return user

def delete_user(user_id, db):
    user = db["user"].delete_one({"user_id": user_id})
    # TODO: add validation later
    return {"deleted user": user["user_id"]}

def view_permissions(user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    # TODO: add validation later
    return {"role": user["role"], "username": user["username"]}

def toggle_permission(user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    # TODO: add validation later
    return {"username": user["username"], "role": user["role"]}

# image issues
def get_images(user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    # TODO: add validation later
    return list(
        db["image"].find(
            {"artist.user_id": user_id},
            {"_id": 0}
        )
    )

def get_image(user_id, image_id, db):
    user = db["user"].find_one({"user_id": user_id})
    # TODO: add validation later
    image = db["image"].find_one(
        {
            "artist.user_id": user_id,
            "image_id": image_id
        },
        {"_id": 0}
    )
    return image

def delete_image(user_id, image_id, db):
    user = db["user"].find_one({"user_id": user_id})
    # TODO: add validation later
    image = db["image"].delete_one(
        {
            "artist.user_id": user_id,
            "image_id": image_id
        },
        {"_id": 0}
    )
    return {"deleted image": image["image_id"]}

# order issues
def get_orders(user_id, db):
    user = db["user"].find_one({"user_id": user_id})
    # TODO: add validation later
    return list(
        db["order"].find(
            {"client.user_id": user_id},
            {"_id": 0}
        )
    )

def get_order(user_id, order_id, db):
    user = db["user"].find_one({"user_id": user_id})
    # TODO: add validation later
    order = db["order"].find_one(
        {
            "client.user_id": user_id,
            "order_id": order_id
        },
        {"_id": 0}
    )
    return {"deleted image": order["order_id"]}

def delete_order(user_id, order_id, db):
    user = db["user"].find_one({"user_id": user_id})
    # TODO: add validation later
    order = db["order"].delete_one(
        {
            "client.user_id": user_id,
            "order_id": order_id
        },
        {"_id": 0}
    )
    return {"deleted image": order["order_id"]}

# TODO:
# create_order
# search_users
# get_profiles
# get_profile
# view_me
# view_settings
# change_settings
# delete_me
# create_user

################################################################