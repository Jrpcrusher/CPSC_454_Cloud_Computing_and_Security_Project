from fastapi import APIRouter, Body, Request, Response, HTTPException, status, Depends
from ...services import db_service
from app.api.deps import *
from ...models.user import *

router = APIRouter()

@router.get("/users", response_model=list[UserResponse]) # Method to get a list of all users in the system
def view_users(db = Depends(get_db)):
    return db_service.get_all_users(db)

@router.get("/users/{user_id}", response_model=UserResponse) # Method to view single user
def view_user(user_id : str, db = Depends(get_db)):
    print("DEBUG db.name:", db.name)
    print("DEBUG collections:", db.list_collection_names())
    print("DEBUG users count:", db["users"].count_documents({}))
    return db_service.get_user(user_id, db)

@router.delete("/users/{user_id}", response_model=UserResponse) # Method to delete single user
def delete_user(user_id: str, db = Depends(get_db)):
    return db_service.delete_user(user_id, db)

@router.patch("/users/{user_id}/role", response_model=UserResponse) # Method to escalate privileges of a user account to admin
def change_roles(user_id: str, db = Depends(get_db)):
    return db_service.change_roles(user_id, db)

# ^^^ DONE ^^^

@router.delete("/items/{item_id}") # method to delete item id
def delete_item(item_id: str, db = Depends(get_db)):
    return db_service.delete_item(item_id, db)

@router.get("/orders") # Method to view all orders
def view_orders(db = Depends(get_db)):
    return db_service.get_all_orders(db)

@router.get("/orders/{order_id}") # method to get specific order information
def view_order(order_id : str, db = Depends(get_db)):
    return db_service.get_order(order_id, db)

@router.delete("/orders/{order_id}") # Method to delete/cancel orders manually
def delete_order(order_id: str, db = Depends(get_db)):
    return db_service.delete_order(order_id, db)