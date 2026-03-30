from fastapi import Request, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from ..services import db_service
from jose import jwt, JWTError
from datetime import datetime, timedelta
from ..core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_db(request: Request):
    return request.app.database

def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)):
    try:
        payload = decode_token(token)
    except Exception: # Check and see if the token has expired
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db_service.get_user(user_id, db)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str):
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )