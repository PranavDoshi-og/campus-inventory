from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .. import database
from ..deps import buyer_only, current_user, organizer_only
from ..models import Order, TicketCode, User
from ..schemas import BatchOrderIn, OrderIn, OrderUpdate, TicketCheckInIn
from ..services import cancel_order, check_in_ticket, place_order, place_orders_batch
from ..utils import oid, ser

router = APIRouter(prefix="/orders", tags=["orders"])


def order_json(order: Order) -> dict:
    result = ser(order)
    result["ticket_codes"] = [ticket.code for ticket in order.tickets]
    result["used_ticket_codes"] = [
        ticket.code for ticket in order.tickets if ticket.checked_in_at is not None
    ]
    return result


@router.post("", status_code=201)
async def create_order(body: OrderIn, user: dict = Depends(buyer_only)):
    return await place_order(oid(body.item_id), user, body.quantity)


@router.post("/batch", status_code=201)
async def create_batch_orders(body: BatchOrderIn, user: dict = Depends(buyer_only)):
    items_input = [
        {"item_id": oid(entry.item_id), "quantity": entry.quantity}
        for entry in body.items
    ]
    return await place_orders_batch(items_input, user)


@router.get("/me")
async def my_orders(
    status: str | None = None,
    search: str | None = None,
    user: dict = Depends(buyer_only),
    session: AsyncSession = Depends(database.get_session),
):
    query = (
        select(Order)
        .where(Order.buyer_id == user["id"])
        .options(selectinload(Order.tickets))
        .order_by(Order.created_at.desc())
        .limit(200)
    )
    if status and status != "all":
        query = query.where(Order.status == status)
    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                Order.item_name.ilike(search_pattern),
                Order.sku.ilike(search_pattern),
                Order.id.ilike(search_pattern),
            )
        )
    orders = (await session.scalars(query)).all()
    return [order_json(order) for order in orders]


@router.get("")
async def all_orders(
    item_id: str | None = None,
    status: str | None = None,
    kind: str | None = None,
    search: str | None = None,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    query = (
        select(Order, User.name, User.email)
        .join(User, Order.buyer_id == User.id)
        .options(selectinload(Order.tickets))
        .order_by(Order.created_at.desc())
        .limit(500)
    )
    if item_id:
        query = query.where(Order.item_id == oid(item_id))
    if status and status != "all":
        query = query.where(Order.status == status)
    if kind and kind != "all":
        query = query.where(Order.kind == kind)
    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                Order.item_name.ilike(search_pattern),
                Order.sku.ilike(search_pattern),
                Order.id.ilike(search_pattern),
                User.name.ilike(search_pattern),
                User.email.ilike(search_pattern),
            )
        )
    rows = (await session.execute(query)).all()
    results = []
    for order, buyer_name, buyer_email in rows:
        result = order_json(order)
        result["buyer_name"] = buyer_name
        result["buyer_email"] = buyer_email
        results.append(result)
    return results


@router.get("/{order_id}")
async def get_order(
    order_id: str,
    user: dict = Depends(current_user),
    session: AsyncSession = Depends(database.get_session),
):
    query = (
        select(Order, User.name, User.email)
        .join(User, Order.buyer_id == User.id)
        .options(selectinload(Order.tickets))
        .where(Order.id == oid(order_id))
    )
    row = (await session.execute(query)).first()
    if not row:
        raise HTTPException(404, "Order not found")
    order, buyer_name, buyer_email = row
    if user["role"] != "organizer" and order.buyer_id != user["id"]:
        raise HTTPException(404, "Order not found")
    result = order_json(order)
    result["buyer_name"] = buyer_name
    result["buyer_email"] = buyer_email
    return result


@router.patch("/{order_id}")
async def update_order(
    order_id: str,
    body: OrderUpdate,
    user: dict = Depends(current_user),
    session: AsyncSession = Depends(database.get_session),
):
    if body.status == "cancelled":
        return await cancel_order(oid(order_id), user)

    order = await session.get(Order, oid(order_id))
    if not order:
        raise HTTPException(404, "Order not found")
    if user["role"] != "organizer" and order.buyer_id != user["id"]:
        raise HTTPException(403, "Not authorized to modify this order")
    order.status = body.status
    await session.commit()
    await session.refresh(order)
    return order_json(order)


@router.delete("/{order_id}")
async def delete_order(
    order_id: str,
    user: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    order = await session.get(Order, oid(order_id))
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status == "confirmed":
        await cancel_order(order.id, user)
    await session.execute(delete(TicketCode).where(TicketCode.order_id == order.id))
    await session.execute(delete(Order).where(Order.id == order.id))
    await session.commit()
    return {"deleted": True, "order_id": order_id, "message": "Order deleted permanently."}


@router.post("/check-in", tags=["ticketing"])
async def ticket_check_in(body: TicketCheckInIn, _: dict = Depends(organizer_only)):
    return await check_in_ticket(body.ticket_code.upper())


@router.post("/{order_id}/cancel")
async def cancel(order_id: str, user: dict = Depends(current_user)):
    return await cancel_order(oid(order_id), user)
