from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timezone
from typing import Optional


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    created_at: datetime


class UserInDB(BaseModel):
    name: str
    email: EmailStr
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
