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
def view_me(user_id: str, db = Depends(get_db)):
    return db_service.view_me(user_id, db)

@router.get("/me/settings", response_model=Settings) # View yourself as user
def view_settings(user_id: str, db = Depends(get_db)):
    return db_service.view_settings(user_id, db)

@router.patch("/me/settings", response_model=Settings) # Change values in settings
def change_settings(user_id: str, settings: Settings, db = Depends(get_db)):
    return db_service.change_settings(user_id, db)

@router.delete("/me") # Delete yourself as user
def delete_me(user_id: str, db = Depends(get_db)):
    return db_service.delete_me(user_id, db)

# Images
@router.get("/me/images", response_model=list[Image]) # View all your images
def view_images(user_id: str, db = Depends(get_db)):
    return db_service.get_images(user_id, db)

@router.get("/me/images/{image_id}", response_model=Image) # View single image
def view_image(user_id: str, image_id: str, db = Depends(get_db)):
    return db_service.get_image(user_id, image_id, db)

@router.delete("/me/images/{image_id}") # Delete single image
def delete_image(user_id: str, image_id: str, db = Depends(get_db)):
    return db_service.delete_image(user_id, image_id, db)

# Orders
@router.get("/me/orders", response_model=list[Order]) # View your orders
def view_orders(user_id: str, db = Depends(get_db)):
    return db_service.get_orders(user_id, db)

@router.get("/me/orders/{order_id}", response_model=Order) # View single order
def view_order(user_id: str, order_id: str, db = Depends(get_db)):
    return db_service.get_order(user_id, order_id, db)

@router.delete("/me/orders/{order_id}") # Delete single order
def delete_order(user_id: str, order_id: str, db = Depends(get_db)):
    return db_service.delete_order(user_id, order_id, db)
