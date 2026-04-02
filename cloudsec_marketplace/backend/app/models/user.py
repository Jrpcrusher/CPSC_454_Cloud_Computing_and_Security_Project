from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from uuid import UUID
from enum import Enum

class UserRole(str, Enum):
    user = "user"
    admin = "admin"

class CreateUser(BaseModel): # For user creation
    username: str = Field(min_length=3, max_length=30, pattern="^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

class PublicProfile(BaseModel): # Return a users public profile
    user_id: UUID
    username: str = Field(min_length=3, max_length=30)
    register_date: datetime
    role: UserRole
    pfp_path: str | None = None
    description: str | None = Field(max_length=500)

class ViewMe(BaseModel): # For viewing own profile
    user_id: UUID
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    register_date: datetime
    role: UserRole
    pfp_path: str | None = None
    description: str | None = Field(max_length=500)

class UpdateSettings(BaseModel): # What is needed for updating settings
    username: str | None = Field(default=None, min_length=3, max_length=30)
    email: EmailStr | None = None
    pfp_path: str | None = None
    description: str | None = Field(default=None, max_length=500)

class Settings(BaseModel): # For viewing settings
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    pfp_path: str | None
    description: str | None = Field(max_length=500)

class UserProfileAdminView(BaseModel): # For viewing profile as admin
    user_id: UUID
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    register_date: datetime
    role: UserRole
    description: str | None = Field(max_length=500)
    pfp_path: str | None = None

class UserPermissions(BaseModel): # For viewing permissions of user
    username: str = Field(min_length=3, max_length=30)
    role: UserRole
    pfp_path: str | None = None

class LoginRequest(BaseModel): # For handling user login requests
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

class UserSummary(BaseModel): # Information about the user
    email: EmailStr
    user_id: UUID
    username: str = Field(min_length=3, max_length=30)
    pfp_path: str | None = None