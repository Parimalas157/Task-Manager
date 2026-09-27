from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default="", max_length=2000)
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.medium
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None
    position: Optional[int] = None


class CommentCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


class CommentOut(BaseModel):
    id: str
    author_id: str
    author_name: str
    text: str
    created_at: datetime


class TaskOut(BaseModel):
    id: str
    project_id: str
    title: str
    description: str
    status: TaskStatus
    priority: TaskPriority
    assignee_id: Optional[str] = None
    creator_id: str
    due_date: Optional[datetime] = None
    position: int = 0
    comments: list[CommentOut] = []
    created_at: datetime
    updated_at: datetime
