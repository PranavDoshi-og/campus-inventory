import secrets

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .. import database
from ..config import settings
from ..deps import current_user
from ..models import User
from ..schemas import ProfileUpdate, RegisterIn
from ..security import create_token, hash_password, verify_password
from ..utils import utcnow

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(body: RegisterIn, session: AsyncSession = Depends(database.get_session)):
    role = "buyer"
    if body.organizer_code:
        if not secrets.compare_digest(body.organizer_code, settings.ORGANIZER_INVITE_CODE):
            raise HTTPException(403, "Invalid organizer invite code")
        role = "organizer"
    user = User(
        name=body.name,
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        role=role,
        created_at=utcnow(),
    )
    session.add(user)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(409, "Email already registered")
    await session.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email, "role": role}


@router.post("/login")
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(database.get_session),
):
    user = await session.scalar(select(User).where(User.email == form.username.lower()))
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return {
        "access_token": create_token(user.id, user.role),
        "token_type": "bearer",
    }


@router.get("/me")
async def me(user: dict = Depends(current_user)):
    return user


@router.patch("/profile")
async def update_profile(
    body: ProfileUpdate,
    user: dict = Depends(current_user),
    session: AsyncSession = Depends(database.get_session),
):
    db_user = await session.get(User, user["id"])
    if not db_user:
        raise HTTPException(404, "User not found")
    if body.name is not None and body.name.strip():
        db_user.name = body.name.strip()
    if body.password is not None and body.password:
        db_user.password_hash = hash_password(body.password)
    if body.organizer_code:
        if body.organizer_code == settings.ORGANIZER_INVITE_CODE:
            db_user.role = "organizer"
        else:
            raise HTTPException(400, "Invalid organizer invite code")
    await session.commit()
    await session.refresh(db_user)
    return {"id": db_user.id, "name": db_user.name, "email": db_user.email, "role": db_user.role}
