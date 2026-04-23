from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from ...services import db_service
from app.api.deps import *
from ...models.user import *
from ...models.image import *
from ...models.order import *

router = APIRouter()
"""
Endpoints:
  GET    /user/me
  DELETE /user/me
  GET    /user/me/settings
  PATCH  /user/me/settings
  POST   /user/me/settings/pfp
  GET    /user/me/images
  GET    /user/me/images/{image_id}
  DELETE /user/me/images/{image_id}
  POST   /user/me/images/upload
  GET    /user/me/order/client
  GET    /user/me/order/artist
  GET    /user/me/order/{order_id}
  DELETE /user/me/order/{order_id}
"""
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
def change_settings(new_settings: UpdateSettings, current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.change_settings(current_user["user_id"], new_settings, db)

@router.post("/me/settings/pfp", response_model=Settings)
def upload_profile_picture(image: UploadFile = File(...), current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.upload_profile_picture(image, current_user["user_id"], db)

@router.delete("/me") # Delete yourself as user
def delete_me(current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.delete_user(current_user["user_id"], db)

# Images
@router.post("/me/images/upload", response_model=Image)
def upload_image(image: UploadFile = File(...), description: str | None = Form(default=None), current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.upload_image(image, description, current_user["user_id"], db)

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
@router.get("/me/orders/client", response_model=list[Order]) # View your orders
def view_orders_as_client(current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.get_orders(current_user["user_id"], "client", db)

@router.get("/me/orders/artist", response_model=list[Order]) # View your orders
def view_orders_as_artist(current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.get_orders(current_user["user_id"], "artist", db)

@router.get("/me/orders/{order_id}", response_model=OrderDetail) # View single order
def view_order(order_id: str, current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.get_order(current_user["user_id"], order_id, db)

@router.delete("/me/orders/{order_id}") # Delete single order
def delete_order(order_id: str, current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.delete_order(current_user["user_id"], order_id, db)

@router.patch("/me/orders/{order_id}/accept")
def accept_order(order_id: str, current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.accept_order(order_id, current_user["user_id"], db)

@router.patch("/me/orders/{order_id}/decline")
def decline_order(order_id: str, current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.decline_order(order_id, current_user["user_id"], db)

@router.post("/me/orders/{order_id}/upload", response_model=OrderAsset)
def upload_order_image(order_id: str, image: UploadFile = File(...), current_user=Depends(get_current_user), db = Depends(get_db)):
    result = db_service.upload_order_image(image, order_id, current_user["user_id"], db)

    # If there's an active transaction, stamp uploaded_at and check escrow
    active_txn = db["transaction"].find_one({
        "order_id": order_id,
        "status": {"$in": ["pending", "funds_held"]}
    })
    if active_txn:
        from app.services.payment_service import mark_art_uploaded_for_escrow
        mark_art_uploaded_for_escrow(order_id=order_id, db=db)

    return result

@router.get("/me/orders/{order_id}/download", response_model=OrderDownloadResponse)
def download_image(order_id: str, current_user=Depends(get_current_user), db = Depends(get_db)):
    return db_service.download_image(order_id, current_user["user_id"], db)

@router.patch("/me/become-creator")
def become_creator(req: BecomeCreatorRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    conflict = db["user"].find_one(
        {"creator_username": req.creator_username, "user_id": {"$ne": current_user["user_id"]}}
    )
    if conflict:
        raise HTTPException(status_code=409, detail="That creator username is already taken.")
    db["user"].update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"role": UserRole.creator, "creator_username": req.creator_username}}
    )
    return {"role": UserRole.creator, "user_id": current_user["user_id"], "creator_username": req.creator_username}

@router.post("/me/orders/{order_id}/approve", response_model=OrderApprovalResponse)
def approve_order(order_id: str, current_user=Depends(get_current_user), db = Depends(get_db)):
    result = db_service.approve_order(order_id, current_user["user_id"], db)
    if result["client_approval"] and result["artist_approval"]:
        # If there's a held escrow transaction, release through the payment system
        escrow_txn = db["transaction"].find_one({
            "order_id": order_id,
            "status": "funds_held"
        })
        if escrow_txn:
            from app.services.payment_service import check_escrow_ready
            check_escrow_ready(order_id, db)
        else:
            # No payment — release art directly (non-escrow path)
            db_service.release_image(order_id, current_user["user_id"], db)
    return result