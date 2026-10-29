from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .. import database
from ..deps import organizer_only
from ..models import Item, Order, PurchaseCounter, User
from ..schemas import UserCreate, UserUpdate
from ..security import hash_password
from ..utils import oid, ser, utcnow

router = APIRouter(prefix="/users", tags=["users"])


def user_public(user: User) -> dict:
    data = ser(user)
    if "password_hash" in data:
        del data["password_hash"]
    return data


@router.get("")
async def list_users(
    role: str | None = None,
    search: str | None = None,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    query = select(User).order_by(User.created_at.desc()).limit(200)
    if role and role != "all":
        query = query.where(User.role == role)
    if search:
        pattern = f"%{search.strip().lower()}%"
        query = query.where(or_(User.name.ilike(pattern), User.email.ilike(pattern)))

    users = (await session.scalars(query)).all()
    results = []
    for u in users:
        order_count = await session.scalar(
            select(func.count(Order.id)).where(Order.buyer_id == u.id)
        ) or 0
        total_spent = await session.scalar(
            select(func.sum(Order.total)).where(Order.buyer_id == u.id, Order.status == "confirmed")
        ) or 0.0
        data = user_public(u)
        data["order_count"] = order_count
        data["total_spent"] = round(float(total_spent), 2)
        results.append(data)
    return results


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    user = await session.get(User, oid(user_id))
    if not user:
        raise HTTPException(404, "User not found")
    data = user_public(user)
    orders = (await session.scalars(
        select(Order).where(Order.buyer_id == user.id).order_by(Order.created_at.desc()).limit(50)
    )).all()
    data["orders"] = [ser(o) for o in orders]
    items = (await session.scalars(
        select(Item).where(Item.created_by == user.id).order_by(Item.created_at.desc()).limit(50)
    )).all()
    data["items_created"] = [ser(i) for i in items]
    return data


@router.post("", status_code=201)
async def create_user(
    body: UserCreate,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    user = User(
        name=body.name.strip(),
        email=body.email.lower().strip(),
        password_hash=hash_password(body.password),
        role=body.role,
        created_at=utcnow(),
    )
    session.add(user)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(409, "Email is already registered")
    await session.refresh(user)
    return user_public(user)


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    body: UserUpdate,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    user = await session.get(User, oid(user_id))
    if not user:
        raise HTTPException(404, "User not found")

    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(422, "No fields to update")

    if "name" in changes and changes["name"]:
        user.name = changes["name"].strip()
    if "email" in changes and changes["email"]:
        user.email = changes["email"].lower().strip()
    if "role" in changes and changes["role"]:
        user.role = changes["role"]
    if "password" in changes and changes["password"]:
        user.password_hash = hash_password(changes["password"])

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(409, "Email already in use by another user")

    await session.refresh(user)
    return user_public(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    user = await session.get(User, oid(user_id))
    if not user:
        raise HTTPException(404, "User not found")

    # Check for foreign key constraints: orders or items created
    order_count = await session.scalar(
        select(func.count(Order.id)).where(Order.buyer_id == user.id)
    ) or 0
    if order_count > 0:
        raise HTTPException(
            409,
            f"Cannot delete user with {order_count} historical order(s). Preserving relational transaction history.",
        )

    item_count = await session.scalar(
        select(func.count(Item.id)).where(Item.created_by == user.id)
    ) or 0
    if item_count > 0:
        raise HTTPException(
            409,
            f"Cannot delete organizer who created {item_count} catalog item(s). Reassign or archive items first.",
        )

    # Delete purchase counters
    await session.execute(delete(PurchaseCounter).where(PurchaseCounter.buyer_id == user.id))
    await session.delete(user)
    await session.commit()
    return {"deleted": True, "user_id": user_id, "message": "User deleted successfully."}

