from fastapi import APIRouter, Depends
from ...models.user import *
from app.api.deps import *
from ...services import db_service

router = APIRouter()

############################################
# Authentication routes possible
############################################

# Register New Account
@router.post("/register") # Create new account
def register(user: CreateUser, db = Depends(get_db) ):
    return  db_service.create_user(user, db)

# Login/logout
@router.post("/login") # Handles logging in the user
def login(login_request: LoginRequest, db = Depends(get_db)):
    success = db_service.get_credentials(login_request, db)
    if not success:
        return {"status": "invalid_credentials"}
    return {"status": "valid_credentials"}

@router.post("/logout") # Handles the user logging out of their account
def logout():
    return {"status": "logout_success"}