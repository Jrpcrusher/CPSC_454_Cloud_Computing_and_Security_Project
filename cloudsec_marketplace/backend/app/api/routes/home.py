from fastapi import APIRouter, Depends, Query
from ...services import db_service
from app.api.deps import *
from ...models.user import *
from ...models.image import *
from ...models.order import *

router = APIRouter()

# Search
@router.get("/users/search", response_model=list[PublicProfile])
def search_users(q: str = Query(..., min_length=1), db = Depends(get_db)):
    return db_service.search_users(q, db, include_private=False)

# Profiles
@router.get("/profiles", response_model=list[PublicProfile])
def get_profiles(db = Depends(get_db)):
    return db_service.get_users(db)

@router.get("/profiles/{user_id}", response_model=PublicProfile)
def get_profile(user_id: str, db = Depends(get_db)):
    return db_service.get_user(user_id, db)

# Images
@router.get("/profiles/{user_id}/images", response_model=list[Image])
def get_images(user_id: str, db = Depends(get_db)):
    return db_service.get_images(user_id, db)

@router.get("/profiles/{user_id}/images/{image_id}", response_model=Image)
def get_image(user_id: str, image_id: str, db = Depends(get_db)):
    return db_service.get_image(user_id, image_id, db)

# Request
@router.post("/profiles/{user_id}/request", response_model=Order)
def create_order(user_id: str, commission_request: CreateOrderRequest, db = Depends(get_db)):
    return db_service.create_order(user_id, get_current_user["user_id"], commission_request, db)