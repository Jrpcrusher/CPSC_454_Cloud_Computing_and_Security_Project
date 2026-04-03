from fastapi import APIRouter, Depends, HTTPException
from ...models.user import *
from app.api.deps import *
from ...services import db_service
from fastapi.security import OAuth2PasswordRequestForm
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
def login(login_request: OAuth2PasswordRequestForm = Depends(), db = Depends(get_db)):
    user = db_service.get_credentials(login_request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid Credentials")
    
    access_token = create_access_token({"user_id": str(user["user_id"])})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/logout") # Handles the user logging out of their account
def logout(current_user=Depends(get_current_user)):
    return {"status": "logout_success"}