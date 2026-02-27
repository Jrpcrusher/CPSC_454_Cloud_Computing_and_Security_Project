from fastapi import APIRouter

router = APIRouter()

@router.get("/users") # Method to get a list of all users in the system
def view_users():
    return []

@router.delete("/users/{user_id}") # Method to delete users
def delete_user(user_id: str):
    # TODO: Make this method delete the user account specified by the ID, along with remove all related artwork
    return {"deleted": user_id}

@router.put("/users/{user_id}/role") # Method to escalate privileges of a user account to admin
def admin(user_id: str):
    # TODO: Make this method take the user id, and give that user admin permissions to be a site admin
    return {"admin": user_id}

@router.delete("/items/{item_id}") # method to delete item id
def delete_item(item_id: str):
    # TODO: Make this method take the item id, and give the admin the ability to remove this item from the website
    return {"deleted": item_id}

@router.get("/orders") # Method to view all orders
def view_orders():
    return []

@router.delete("/orders/{order_id}") # Method to delete/cancel orders manually
def delete_order(order_id: str):
    return {"cancelled": order_id}