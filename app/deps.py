import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from . import database
from .security import decode_token
from .utils import oid

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def user_from_token(token: str) -> dict:
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = await database.db.users.find_one({"_id": oid(payload["sub"])})
    if not user:
        raise HTTPException(401, "User no longer exists")
    return user


async def current_user(token: str = Depends(oauth2)) -> dict:
    return await user_from_token(token)


def require_role(*roles: str):
    async def checker(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(403, f"Requires role: {', '.join(roles)}")
        return user

    return checker


organizer_only = require_role("organizer")
buyer_only = require_role("buyer")
