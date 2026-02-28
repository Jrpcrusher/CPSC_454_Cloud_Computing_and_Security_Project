from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Body, Request, Response, HTTPException, status
from fastapi.encoders import jsonable_encoder
from typing import List
from app.models.user import *

################################################################
# Handling user accounts, view all, view one, create one, delete one
################################################################

def get_all_users(db): # Helper function that gets all the users from the database
    users = list(db["users"].find())
    for user in users:
        user["id"] = str(user.pop("_id"))
    return users # Return all the users

def get_user(user_id, db):
    try: # Check to see if the user id even exists
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user id.")

    user = db["users"].find_one({"_id": oid})

    if not user: # if we dont find the user, then say user was not found
        raise HTTPException(status_code=404, detail="User not found.")
    
    user["id"] = str(user.pop("_id"))
    return user

def delete_user(user_id, db):
    try: # Check to see if the user id even exists
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user id.")
    
    deleted_user = db["users"].delete_one({"_id": oid})

    if deleted_user.deleted_count == 0: # if we dont find the user, then say user was not found
        raise HTTPException(status_code=404, detail="User not found.")

    return deleted_user.deleted_count

def change_role(user_id, db):
    try: # Check to see if the user id even exists
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user id.")
    user = db["users"].find_one({"_id": oid})
    if not user: # if we dont find the user, then say user was not found
        raise HTTPException(status_code=404, detail="User not found.")
    
    current_role = user.get("role","user")
    new_role = "admin" if current_role == "user" else "user"

    updated_user = db["users"].update_one(
        {"_id": oid},
        {"$set": {"role": new_role}}
    )

    if updated_user.matched_count == 0: # if we dont find the user, then say user was not found
        raise HTTPException(status_code=404, detail="User not found.")
    
    return {"message": f"Role of user changed to {new_role}"}
# ^^^ DONE ^^^

def create_user(user: CreateUser):
    
    return None

################################################################