from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, UUID4


# Base schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "operator"
    is_active: str = "Y"


class UserCreate(UserBase):
    password: str
    organization_id: UUID4


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[str] = None
    password: Optional[str] = None


class UserInDB(UserBase):
    id: UUID4
    organization_id: UUID4
    hashed_password: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class User(UserBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: User
