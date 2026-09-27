from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import get_current_user
from app.database import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search")
async def search_users(q: str = Query(..., min_length=1), current_user: dict = Depends(get_current_user)):
    """Search users by name/email prefix, used when inviting members to a project."""
    db = get_db()
    cursor = db.users.find(
        {
            "$or": [
                {"email": {"$regex": f"^{q}", "$options": "i"}},
                {"name": {"$regex": q, "$options": "i"}},
            ]
        }
    ).limit(10)

    results = []
    async for user in cursor:
        results.append(
            {"id": str(user["_id"]), "name": user["name"], "email": user["email"]}
        )
    return results
