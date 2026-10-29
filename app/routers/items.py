from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .. import database
from ..deps import current_user, organizer_only
from ..models import Item
from ..schemas import ItemCreate, ItemUpdate, RestockIn
from ..services import _broadcast_stock_change, _record_stock_alert
from ..utils import aware, oid, ser, utcnow

router = APIRouter(prefix="/items", tags=["items"])


@router.get("")
async def list_items(
    kind: str | None = None,
    user: dict = Depends(current_user),
    session: AsyncSession = Depends(database.get_session),
):
    query = select(Item)
    if kind:
        query = query.where(Item.kind == kind)
    if user["role"] != "organizer":
        query = query.where(Item.active.is_(True))
    docs = (await session.scalars(query.order_by(Item.name).limit(500))).all()
    return [ser(item) for item in docs]


@router.get("/{item_id}")
async def get_item(
    item_id: str,
    user: dict = Depends(current_user),
    session: AsyncSession = Depends(database.get_session),
):
    item = await session.get(Item, oid(item_id))
    if not item or (not item.active and user["role"] != "organizer"):
        raise HTTPException(404, "Item not found")
    return ser(item)


@router.post("", status_code=201)
async def create_item(
    body: ItemCreate,
    user: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    fields = body.model_dump()
    fields["price"] = Decimal(str(fields["price"]))
    for key in ("sale_starts_at", "sale_ends_at", "event_date"):
        fields[key] = aware(fields[key])
    item = Item(
        **fields,
        sold=0,
        active=True,
        created_by=user["id"],
        created_at=utcnow(),
    )
    session.add(item)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(409, "SKU already exists or item violates a database constraint")
    await session.refresh(item)
    result = ser(item)
    await _broadcast_stock_change(item, None)
    return result


@router.patch("/{item_id}")
async def update_item(
    item_id: str,
    body: ItemUpdate,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(422, "No fields to update")
    item = await session.get(Item, oid(item_id))
    if not item:
        raise HTTPException(404, "Item not found")
    for key in ("sale_starts_at", "sale_ends_at", "event_date"):
        if key in changes:
            changes[key] = aware(changes[key])
    if "price" in changes:
        changes["price"] = Decimal(str(changes["price"]))
    starts_at = changes.get("sale_starts_at", item.sale_starts_at)
    ends_at = changes.get("sale_ends_at", item.sale_ends_at)
    if starts_at and ends_at and ends_at <= starts_at:
        raise HTTPException(422, "sale_ends_at must be after sale_starts_at")
    for key, value in changes.items():
        setattr(item, key, value)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(422, "Item violates a database constraint")
    await session.refresh(item)
    await _broadcast_stock_change(item, None)
    return ser(item)


@router.post("/{item_id}/restock")
async def restock(
    item_id: str,
    body: RestockIn,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    async with session.begin():
        await session.execute(text("BEGIN IMMEDIATE"))
        item = await session.get(Item, oid(item_id))
        if not item:
            raise HTTPException(409, "Item not found or write-off exceeds current stock")
        previous_stock = item.stock
        query = update(Item).where(Item.id == item.id)
        if body.delta < 0:
            query = query.where(Item.stock >= -body.delta)
        result = await session.execute(query.values(stock=Item.stock + body.delta))
        if result.rowcount != 1:
            raise HTTPException(409, "Item not found or write-off exceeds current stock")
        await session.refresh(item)
        alert = await _record_stock_alert(session, item, previous_stock)
    await _broadcast_stock_change(item, alert)
    return ser(item)
