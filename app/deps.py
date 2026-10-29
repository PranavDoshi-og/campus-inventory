import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from . import database
from .models import User
from .security import decode_token
from .utils import oid

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def user_from_token(token: str) -> dict:
    try:
        payload = decode_token(token)
        user_id = oid(payload["sub"])
    except (jwt.PyJWTError, KeyError, HTTPException):
        raise HTTPException(401, "Invalid or expired token")
    async with database.SessionLocal() as session:
        user = await session.get(User, user_id)
        if not user:
            raise HTTPException(401, "User no longer exists")
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        }


async def current_user(
    token: str = Depends(oauth2),
) -> dict:
    return await user_from_token(token)


def require_role(*roles: str):
    async def checker(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(403, f"Requires role: {', '.join(roles)}")
        return user

    return checker


organizer_only = require_role("organizer")
buyer_only = require_role("buyer")
