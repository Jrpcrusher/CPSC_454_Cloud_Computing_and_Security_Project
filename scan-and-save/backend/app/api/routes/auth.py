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
def login(login_request: LoginRequest):
    status = 0; # Default status of 0 for user not logged in
    # TODO: get_credentials(), email/username and password
    # Regular users can opt into MFA, but not required
    if not status:
        return {"status": "login_failed"}
    return {"status": "login_success"}

@router.post("/logout") # Handles the user logging out of their account
def logout():
    return {"status": "logout_success"}