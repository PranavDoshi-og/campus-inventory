from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, desc, func, or_, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .. import database
from ..deps import current_user, organizer_only
from ..models import Alert, Item, Order, PurchaseCounter
from ..realtime import manager
from ..schemas import ItemCreate, ItemUpdate, RestockIn
from ..services import _broadcast_stock_change, _record_stock_alert
from ..utils import aware, oid, ser, utcnow

router = APIRouter(prefix="/items", tags=["items"])


@router.get("")
async def list_items(
    kind: str | None = None,
    status: str | None = None,
    search: str | None = None,
    user: dict = Depends(current_user),
    session: AsyncSession = Depends(database.get_session),
):
    query = select(Item)
    if kind and kind != "all":
        query = query.where(Item.kind == kind)
    if user["role"] != "organizer":
        query = query.where(Item.active.is_(True))
    if status == "in_stock":
        query = query.where(Item.stock > 0)
    elif status == "low_stock":
        query = query.where(Item.stock > 0, Item.stock <= Item.low_stock_threshold)
    elif status == "sold_out":
        query = query.where(Item.stock == 0)
    if search:
        pattern = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                Item.name.ilike(pattern),
                Item.sku.ilike(pattern),
                Item.description.ilike(pattern),
            )
        )
    docs = (await session.scalars(query.order_by(Item.name).limit(500))).all()
    return [ser(item) for item in docs]


@router.get("/recommendations")
async def get_recommendations(
    limit: int = 4,
    user: dict = Depends(current_user),
    session: AsyncSession = Depends(database.get_session),
):
    user_id = user["id"]
    # 1. Get IDs of items previously bought by this user
    user_orders_query = (
        select(Order.item_id, Order.item_name)
        .where(Order.buyer_id == user_id, Order.status == "confirmed")
    )
    user_orders = (await session.execute(user_orders_query)).all()
    user_item_ids = {row[0] for row in user_orders}

    recommendations = []
    seen_item_ids = set(user_item_ids)

    # Collaborative filtering: Find peers who bought the same items
    if user_item_ids:
        peer_buyers_query = (
            select(Order.buyer_id)
            .where(
                Order.item_id.in_(user_item_ids),
                Order.buyer_id != user_id,
                Order.status == "confirmed",
            )
            .distinct()
            .limit(100)
        )
        peer_buyer_ids = (await session.scalars(peer_buyers_query)).all()

        if peer_buyer_ids:
            rec_query = (
                select(Item, func.count(Order.id).label("affinity_score"))
                .join(Order, Item.id == Order.item_id)
                .where(
                    Order.buyer_id.in_(peer_buyer_ids),
                    Order.status == "confirmed",
                    Item.active.is_(True),
                    Item.stock > 0,
                    Item.id.notin_(user_item_ids),
                )
                .group_by(Item.id)
                .order_by(desc("affinity_score"))
                .limit(limit)
            )
            rec_rows = (await session.execute(rec_query)).all()
            for item, score in rec_rows:
                if item.id not in seen_item_ids:
                    seen_item_ids.add(item.id)
                    data = ser(item)
                    data["recommendation_reason"] = "Frequently picked by students with similar taste"
                    data["affinity_score"] = score
                    recommendations.append(data)

        # Category/Kind preference: check user's most purchased category
        if len(recommendations) < limit:
            kind_query = (
                select(Order.kind, func.count(Order.id).label("cnt"))
                .where(Order.buyer_id == user_id, Order.status == "confirmed")
                .group_by(Order.kind)
                .order_by(desc("cnt"))
                .limit(1)
            )
            top_kind = (await session.execute(kind_query)).first()
            if top_kind:
                preferred_kind = top_kind[0]
                kind_items_query = (
                    select(Item)
                    .where(
                        Item.kind == preferred_kind,
                        Item.active.is_(True),
                        Item.stock > 0,
                        Item.id.notin_(seen_item_ids),
                    )
                    .order_by(desc(Item.sold), Item.name)
                    .limit(limit - len(recommendations))
                )
                kind_items = (await session.scalars(kind_items_query)).all()
                for item in kind_items:
                    if item.id not in seen_item_ids:
                        seen_item_ids.add(item.id)
                        data = ser(item)
                        data["recommendation_reason"] = f"Top trending in {preferred_kind} based on your picks"
                        data["affinity_score"] = 1
                        recommendations.append(data)

    # Fallback / Cold Start: Top-selling active items across campus
    if len(recommendations) < limit:
        remaining = limit - len(recommendations)
        pop_query = (
            select(Item)
            .where(
                Item.active.is_(True),
                Item.stock > 0,
                Item.id.notin_(seen_item_ids),
            )
            .order_by(desc(Item.sold), Item.created_at.desc())
            .limit(remaining)
        )
        pop_items = (await session.scalars(pop_query)).all()
        for item in pop_items:
            if item.id not in seen_item_ids:
                seen_item_ids.add(item.id)
                data = ser(item)
                data["recommendation_reason"] = "Campus Bestseller · Trending Now"
                data["affinity_score"] = 0
                recommendations.append(data)

    return recommendations


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


@router.delete("/{item_id}")
async def delete_or_archive_item(
    item_id: str,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    item = await session.get(Item, oid(item_id))
    if not item:
        raise HTTPException(404, "Item not found")
    order_count = await session.scalar(
        select(func.count(Order.id)).where(Order.item_id == item.id)
    )
    if order_count > 0:
        item.active = False
        await session.commit()
        await _broadcast_stock_change(item, None)
        return {
            "action": "archived",
            "message": "Item has historical orders and was archived to preserve relational audit records.",
            "item": ser(item),
        }
    else:
        await session.execute(delete(PurchaseCounter).where(PurchaseCounter.item_id == item.id))
        await session.execute(delete(Alert).where(Alert.item_id == item.id))
        await session.delete(item)
        await session.commit()
        await manager.broadcast({
            "type": "stock_update",
            "item_id": str(item.id),
            "sku": item.sku,
            "stock": 0,
            "sold": 0,
            "active": False,
        })
        return {"action": "deleted", "message": "Item deleted permanently."}


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
