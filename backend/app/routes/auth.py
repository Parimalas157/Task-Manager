from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.auth.dependencies import get_current_user
from app.auth.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models.user import Token, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def user_doc_to_out(user: dict) -> UserOut:
    return UserOut(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        created_at=user["created_at"],
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate):
    db = get_db()

    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "name": payload.name.strip(),
        "email": payload.email.lower(),
        "hashed_password": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = create_access_token(subject=str(result.inserted_id))
    return Token(access_token=token, user=user_doc_to_out(user_doc))


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_db()
    user = await db.users.find_one({"email": form_data.username.lower()})

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(subject=str(user["_id"]))
    return Token(access_token=token, user=user_doc_to_out(user))


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_doc_to_out(current_user)
