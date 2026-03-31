from fastapi import APIRouter, Depends
from ...services import db_service
from app.api.deps import *
from ...models.user import *
from ...models.image import *
from ...models.order import *

router = APIRouter()

############################################
# User routes possible
############################################

# user profile management
@router.get("/me", response_model=ViewMe) # View yourself as user
def view_me(current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.get_user(current_user["user_id"], db)

@router.get("/me/settings", response_model=Settings) # View yourself as user
def view_settings(current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.get_user(current_user["user_id"], db)

@router.patch("/me/settings", response_model=Settings) # Change values in settings
def change_settings(new_settings: Settings, current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.change_settings(current_user["user_id"], new_settings, db)

@router.delete("/me") # Delete yourself as user
def delete_me(current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.delete_user(current_user["user_id"], db)

# Images
@router.get("/me/images", response_model=list[Image]) # View all your images
def view_images(current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.get_images(current_user["user_id"], db)

@router.get("/me/images/{image_id}", response_model=Image) # View single image
def view_image(image_id: str, current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.get_image(current_user["user_id"], image_id, db)

@router.delete("/me/images/{image_id}") # Delete single image
def delete_image(image_id: str, current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.delete_image(current_user["user_id"], image_id, db)

# Orders
@router.get("/me/orders", response_model=list[Order]) # View your orders
def view_orders(current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.get_orders(current_user["user_id"], db)

@router.get("/me/orders/{order_id}", response_model=Order) # View single order
def view_order(order_id: str, current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.get_order(current_user["user_id"], order_id, db)

@router.delete("/me/orders/{order_id}") # Delete single order
def delete_order(order_id: str, current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.delete_order(current_user["user_id"], order_id, db)
