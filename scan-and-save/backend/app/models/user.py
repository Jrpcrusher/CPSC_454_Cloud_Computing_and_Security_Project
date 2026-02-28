from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime

class CreateUser(BaseModel): # The data model for creating a new user, these are the values needed
    email: EmailStr
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    username: str
    role: str
    createdAt: datetime

class UpdateRole(BaseModel):
    role: Literal["user", "admin"]