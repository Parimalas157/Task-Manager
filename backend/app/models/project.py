from pydantic import BaseModel, Field, EmailStr
from datetime import datetime, timezone
from typing import List, Optional


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(default="", max_length=1000)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)


class MemberInvite(BaseModel):
    email: EmailStr


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str
    owner_id: str
    member_ids: List[str] = []
    created_at: datetime

    task_counts: Optional[dict] = None
