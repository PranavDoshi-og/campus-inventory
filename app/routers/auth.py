import secrets

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pymongo.errors import DuplicateKeyError

from .. import database
from ..config import settings
from ..deps import current_user
from ..schemas import RegisterIn
from ..security import create_token, hash_password, verify_password
from ..utils import utcnow

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(body: RegisterIn):
    role = "buyer"
    if body.organizer_code:
        if not secrets.compare_digest(body.organizer_code, settings.ORGANIZER_INVITE_CODE):
            raise HTTPException(403, "Invalid organizer invite code")
        role = "organizer"
    try:
        res = await database.db.users.insert_one({
            "name": body.name,
            "email": body.email.lower(),
            "password_hash": hash_password(body.password),
            "role": role,
            "created_at": utcnow(),
        })
    except DuplicateKeyError:
        raise HTTPException(409, "Email already registered")
    return {"id": str(res.inserted_id), "role": role}


@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends()):
    user = await database.db.users.find_one({"email": form.username.lower()})
    if not user or not verify_password(form.password, user["password_hash"]):
        raise HTTPException(401, "Incorrect email or password")
    return {
        "access_token": create_token(str(user["_id"]), user["role"]),
        "token_type": "bearer",
        "role": user["role"],
    }


@router.get("/me")
async def me(user: dict = Depends(current_user)):
    return {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "role": user["role"]}
