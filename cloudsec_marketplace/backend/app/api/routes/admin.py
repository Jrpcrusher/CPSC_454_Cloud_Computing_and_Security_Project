from fastapi import APIRouter, Depends, Query
from ...services import db_service
from app.api.deps import *
from ...models.user import *
from ...models.image import *
from ...models.order import *

router = APIRouter(
    dependencies=[Depends(get_current_admin)]
)

############################################
# Admin routes possible
############################################

# users
@router.get("/users", response_model=list[UserProfileAdminView]) # View all user profiles (admin view)
def view_users(db = Depends(get_db)):
    return db_service.get_users(db)

@router.get("/users/search", response_model=list[UserProfileAdminView]) # Search for users
def search_users(q: str = Query(..., min_length=1), db = Depends(get_db)):
    return db_service.search_users(q, db, include_private=True)


@router.get("/users/{user_id}", response_model=UserProfileAdminView) # View single user profile (admin view)
def view_user(user_id : str, db = Depends(get_db)):
    return db_service.get_user(user_id, db)

@router.delete("/users/{user_id}") # Method to delete single user
def delete_user(user_id: str, db = Depends(get_db)):
    return db_service.delete_user(user_id, db)

@router.get("/users/{user_id}/permissions", response_model=UserPermissions) # View user privilege
def view_permissions(user_id: str, db = Depends(get_db)):
    return db_service.view_permissions(user_id, db)

@router.patch("/users/{user_id}/permissions") # Method to elevate privileges
def toggle_permission(user_id: str, db = Depends(get_db)):
    return db_service.toggle_permission(user_id, db)

# Images
@router.get("/users/{user_id}/images", response_model=list[Image]) # View all images from user
def view_images(user_id: str, db = Depends(get_db)):
    return db_service.get_images(user_id, db)

@router.get("/users/{user_id}/images/{image_id}", response_model=Image) # View single image from user
def view_image(user_id: str, image_id: str, db = Depends(get_db)):
    return db_service.get_image(user_id, image_id, db)

@router.delete("/users/{user_id}/images/{image_id}") # Method to delete single image from user
def delete_image(user_id: str, image_id: str, db = Depends(get_db)):
    return db_service.delete_image(user_id, image_id, db)

# Orders
@router.get("/users/{user_id}/orders", response_model=list[Order]) # View all orders from user
def view_orders(user_id: str, db = Depends(get_db)):
    return db_service.get_orders(user_id, "admin", db)

@router.get("/users/{user_id}/orders/{order_id}", response_model=Order) # View single order from user
def view_order(user_id: str, order_id: str, db = Depends(get_db)):
    return db_service.get_order(user_id, order_id, db)

@router.delete("/users/{user_id}/orders/{order_id}") # Method to delete single order from user
def delete_order(user_id: str, order_id: str, db = Depends(get_db)):
    return db_service.delete_order(user_id, order_id, db)

# Reports (Opttional later thing)