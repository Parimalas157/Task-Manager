from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.project import MemberInvite, ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


def to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid id format")


async def get_project_or_404(db, project_id: str, user_id: str) -> dict:
    project = await db.projects.find_one({"_id": to_object_id(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    allowed_ids = [str(project["owner_id"])] + [str(m) for m in project.get("member_ids", [])]
    if user_id not in allowed_ids:
        raise HTTPException(status_code=403, detail="You don't have access to this project")

    return project


def project_doc_to_out(project: dict, task_counts: dict = None) -> ProjectOut:
    return ProjectOut(
        id=str(project["_id"]),
        name=project["name"],
        description=project.get("description", ""),
        owner_id=str(project["owner_id"]),
        member_ids=[str(m) for m in project.get("member_ids", [])],
        created_at=project["created_at"],
        task_counts=task_counts,
    )


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    project_doc = {
        "name": payload.name.strip(),
        "description": payload.description or "",
        "owner_id": ObjectId(current_user["id"]),
        "member_ids": [],
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.projects.insert_one(project_doc)
    project_doc["_id"] = result.inserted_id
    return project_doc_to_out(project_doc)


@router.get("", response_model=list[ProjectOut])
async def list_projects(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_oid = ObjectId(current_user["id"])

    cursor = db.projects.find(
        {"$or": [{"owner_id": user_oid}, {"member_ids": user_oid}]}
    ).sort("created_at", -1)

    projects = []
    async for project in cursor:
        counts = {}
        pipeline = [
            {"$match": {"project_id": project["_id"]}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
        async for row in db.tasks.aggregate(pipeline):
            counts[row["_id"]] = row["count"]
        projects.append(project_doc_to_out(project, task_counts=counts))

    return projects


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    project = await get_project_or_404(db, project_id, current_user["id"])
    return project_doc_to_out(project)


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: str, payload: ProjectUpdate, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    project = await get_project_or_404(db, project_id, current_user["id"])

    if str(project["owner_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can edit this project")

    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        await db.projects.update_one({"_id": project["_id"]}, {"$set": updates})
        project.update(updates)

    return project_doc_to_out(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    project = await get_project_or_404(db, project_id, current_user["id"])

    if str(project["owner_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can delete this project")

    await db.projects.delete_one({"_id": project["_id"]})
    await db.tasks.delete_many({"project_id": project["_id"]})


@router.post("/{project_id}/members", response_model=ProjectOut)
async def add_member(
    project_id: str, payload: MemberInvite, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    project = await get_project_or_404(db, project_id, current_user["id"])

    if str(project["owner_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can add members")

    member = await db.users.find_one({"email": payload.email.lower()})
    if not member:
        raise HTTPException(status_code=404, detail="No user found with that email")

    await db.projects.update_one(
        {"_id": project["_id"]}, {"$addToSet": {"member_ids": member["_id"]}}
    )
    project = await db.projects.find_one({"_id": project["_id"]})
    return project_doc_to_out(project)


@router.delete("/{project_id}/members/{member_id}", response_model=ProjectOut)
async def remove_member(
    project_id: str, member_id: str, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    project = await get_project_or_404(db, project_id, current_user["id"])

    if str(project["owner_id"]) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can remove members")

    await db.projects.update_one(
        {"_id": project["_id"]}, {"$pull": {"member_ids": to_object_id(member_id)}}
    )
    project = await db.projects.find_one({"_id": project["_id"]})
    return project_doc_to_out(project)
