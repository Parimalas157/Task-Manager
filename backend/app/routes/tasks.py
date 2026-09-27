from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.task import CommentCreate, TaskCreate, TaskOut, TaskUpdate
from app.routes.projects import get_project_or_404, to_object_id
from app.utils.ws_manager import manager

router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["tasks"])


def task_doc_to_out(task: dict) -> TaskOut:
    comments = [
        {
            "id": str(c.get("_id", ObjectId())),
            "author_id": str(c["author_id"]),
            "author_name": c["author_name"],
            "text": c["text"],
            "created_at": c["created_at"],
        }
        for c in task.get("comments", [])
    ]
    return TaskOut(
        id=str(task["_id"]),
        project_id=str(task["project_id"]),
        title=task["title"],
        description=task.get("description", ""),
        status=task["status"],
        priority=task["priority"],
        assignee_id=str(task["assignee_id"]) if task.get("assignee_id") else None,
        creator_id=str(task["creator_id"]),
        due_date=task.get("due_date"),
        position=task.get("position", 0),
        comments=comments,
        created_at=task["created_at"],
        updated_at=task["updated_at"],
    )


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: str, payload: TaskCreate, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    await get_project_or_404(db, project_id, current_user["id"])

    now = datetime.now(timezone.utc)
    task_doc = {
        "project_id": to_object_id(project_id),
        "title": payload.title.strip(),
        "description": payload.description or "",
        "status": payload.status,
        "priority": payload.priority,
        "assignee_id": to_object_id(payload.assignee_id) if payload.assignee_id else None,
        "creator_id": ObjectId(current_user["id"]),
        "due_date": payload.due_date,
        "position": 0,
        "comments": [],
        "created_at": now,
        "updated_at": now,
    }
    result = await db.tasks.insert_one(task_doc)
    task_doc["_id"] = result.inserted_id

    task_out = task_doc_to_out(task_doc)
    await manager.broadcast(project_id, {"type": "task_created", "task": task_out.model_dump(mode="json")})
    return task_out


@router.get("", response_model=list[TaskOut])
async def list_tasks(project_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await get_project_or_404(db, project_id, current_user["id"])

    cursor = db.tasks.find({"project_id": to_object_id(project_id)}).sort("position", 1)
    tasks = [task_doc_to_out(t) async for t in cursor]
    return tasks


async def get_task_or_404(db, project_id: str, task_id: str) -> dict:
    task = await db.tasks.find_one(
        {"_id": to_object_id(task_id), "project_id": to_object_id(project_id)}
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    project_id: str,
    task_id: str,
    payload: TaskUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    await get_project_or_404(db, project_id, current_user["id"])
    task = await get_task_or_404(db, project_id, task_id)

    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "assignee_id" in updates:
        updates["assignee_id"] = to_object_id(updates["assignee_id"]) if updates["assignee_id"] else None
    updates["updated_at"] = datetime.now(timezone.utc)

    await db.tasks.update_one({"_id": task["_id"]}, {"$set": updates})
    task.update(updates)

    task_out = task_doc_to_out(task)
    await manager.broadcast(project_id, {"type": "task_updated", "task": task_out.model_dump(mode="json")})
    return task_out


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    project_id: str, task_id: str, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    await get_project_or_404(db, project_id, current_user["id"])
    task = await get_task_or_404(db, project_id, task_id)

    await db.tasks.delete_one({"_id": task["_id"]})
    await manager.broadcast(project_id, {"type": "task_deleted", "task_id": task_id})


@router.post("/{task_id}/comments", response_model=TaskOut)
async def add_comment(
    project_id: str,
    task_id: str,
    payload: CommentCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    await get_project_or_404(db, project_id, current_user["id"])
    task = await get_task_or_404(db, project_id, task_id)

    comment = {
        "_id": ObjectId(),
        "author_id": ObjectId(current_user["id"]),
        "author_name": current_user["name"],
        "text": payload.text.strip(),
        "created_at": datetime.now(timezone.utc),
    }
    await db.tasks.update_one(
        {"_id": task["_id"]},
        {"$push": {"comments": comment}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    task["comments"] = task.get("comments", []) + [comment]

    task_out = task_doc_to_out(task)
    await manager.broadcast(project_id, {"type": "task_updated", "task": task_out.model_dump(mode="json")})
    return task_out
