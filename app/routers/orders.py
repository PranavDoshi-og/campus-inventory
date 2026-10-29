from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .. import database
from ..deps import buyer_only, current_user, organizer_only
from ..models import Order, User
from ..schemas import OrderIn, TicketCheckInIn
from ..services import cancel_order, check_in_ticket, place_order
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


@router.get("/me")
async def my_orders(
    user: dict = Depends(buyer_only),
    session: AsyncSession = Depends(database.get_session),
):
    orders = (
        await session.scalars(
            select(Order)
            .where(Order.buyer_id == user["id"])
            .options(selectinload(Order.tickets))
            .order_by(Order.created_at.desc())
            .limit(200)
        )
    ).all()
    return [order_json(order) for order in orders]


@router.get("")
async def all_orders(
    item_id: str | None = None,
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
    rows = (await session.execute(query)).all()
    results = []
    for order, buyer_name, buyer_email in rows:
        result = order_json(order)
        result["buyer_name"] = buyer_name
        result["buyer_email"] = buyer_email
        results.append(result)
    return results


@router.post("/check-in", tags=["ticketing"])
async def ticket_check_in(body: TicketCheckInIn, _: dict = Depends(organizer_only)):
    return await check_in_ticket(body.ticket_code.upper())


@router.post("/{order_id}/cancel")
async def cancel(order_id: str, user: dict = Depends(current_user)):
    return await cancel_order(oid(order_id), user)
