"""Transactional order, ticket, and stock-alert workflows."""
import secrets
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select, text, update
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from . import database
from .models import Alert, Item, Order, PurchaseCounter, TicketCode
from .realtime import manager
from .utils import ser, utcnow


async def emit_stock_update(item: dict) -> None:
    await manager.broadcast({
        "type": "stock_update",
        "item_id": str(item["id"]),
        "sku": item["sku"],
        "stock": item["stock"],
        "sold": item.get("sold", 0),
        "active": item.get("active", True),
    })


async def _record_stock_alert(session, item: Item, previous_stock: int) -> dict | None:
    stock, threshold = item.stock, item.low_stock_threshold
    alert_type = None
    if stock == 0 and previous_stock > 0:
        alert_type = "sold_out"
    elif previous_stock > threshold >= stock:
        alert_type = "low_stock"
    if not alert_type:
        return None
    alert = Alert(
        item_id=item.id,
        sku=item.sku,
        item_name=item.name,
        type=alert_type,
        stock=stock,
        threshold=threshold,
        acknowledged=False,
        created_at=utcnow(),
    )
    session.add(alert)
    await session.flush()
    return ser(alert)


async def _broadcast_stock_change(item: Item, alert: dict | None) -> None:
    await emit_stock_update(ser(item))
    if alert:
        await manager.broadcast({"type": "alert", "alert": alert}, roles={"organizer"})


async def place_order(item_id: str, user: dict, qty: int) -> dict:
    now = utcnow()
    alert = None
    async with database.SessionLocal() as session:
        async with session.begin():
            await session.execute(text("BEGIN IMMEDIATE"))
            item = await session.get(Item, item_id)
            if not item or not item.active:
                raise HTTPException(404, "Item not available")
            if item.sale_starts_at and now < item.sale_starts_at:
                raise HTTPException(409, "Sale has not started yet")
            if item.sale_ends_at and now > item.sale_ends_at:
                raise HTTPException(409, "Sale has ended")

            if item.per_user_limit is not None:
                if qty > item.per_user_limit:
                    raise HTTPException(409, f"Limit is {item.per_user_limit} per buyer")
                claim = sqlite_insert(PurchaseCounter).values(
                    item_id=item_id, buyer_id=user["id"], quantity=qty
                )
                claim = claim.on_conflict_do_update(
                    index_elements=["item_id", "buyer_id"],
                    set_={"quantity": PurchaseCounter.quantity + qty},
                    where=PurchaseCounter.quantity + qty <= item.per_user_limit,
                )
                result = await session.execute(claim)
                if result.rowcount != 1:
                    raise HTTPException(409, f"Limit of {item.per_user_limit} per buyer reached")

            previous_stock = item.stock
            reservation = await session.execute(
                update(Item)
                .where(Item.id == item_id, Item.active.is_(True), Item.stock >= qty)
                .values(stock=Item.stock - qty, sold=Item.sold + qty)
            )
            if reservation.rowcount != 1:
                raise HTTPException(409, "Insufficient stock")
            await session.refresh(item)

            unit_price = Decimal(item.price)
            order = Order(
                buyer_id=user["id"],
                item_id=item.id,
                sku=item.sku,
                item_name=item.name,
                kind=item.kind,
                quantity=qty,
                unit_price=unit_price,
                total=unit_price * qty,
                status="confirmed",
                created_at=now,
            )
            session.add(order)
            await session.flush()
            codes = []
            if item.kind == "ticket":
                codes = [secrets.token_hex(4).upper() for _ in range(qty)]
                session.add_all(
                    [TicketCode(code=code, order_id=order.id) for code in codes]
                )
            alert = await _record_stock_alert(session, item, previous_stock)
            order_data = ser(order)
            order_data["ticket_codes"] = codes
            order_data["used_ticket_codes"] = []

    await _broadcast_stock_change(item, alert)
    return order_data


async def place_orders_batch(items_input: list[dict], user: dict) -> list[dict]:
    consolidated: dict[str, int] = {}
    for entry in items_input:
        iid = str(entry["item_id"])
        consolidated[iid] = consolidated.get(iid, 0) + int(entry["quantity"])

    now = utcnow()
    orders_data = []
    broadcast_actions = []

    async with database.SessionLocal() as session:
        async with session.begin():
            await session.execute(text("BEGIN IMMEDIATE"))
            for item_id, qty in consolidated.items():
                item = await session.get(Item, item_id)
                if not item or not item.active:
                    raise HTTPException(404, f"Item not available")
                if item.sale_starts_at and now < item.sale_starts_at:
                    raise HTTPException(409, f"Sale for '{item.name}' has not started yet")
                if item.sale_ends_at and now > item.sale_ends_at:
                    raise HTTPException(409, f"Sale for '{item.name}' has ended")

                if item.per_user_limit is not None:
                    if qty > item.per_user_limit:
                        raise HTTPException(409, f"Limit is {item.per_user_limit} per buyer for '{item.name}'")
                    claim = sqlite_insert(PurchaseCounter).values(
                        item_id=item_id, buyer_id=user["id"], quantity=qty
                    )
                    claim = claim.on_conflict_do_update(
                        index_elements=["item_id", "buyer_id"],
                        set_={"quantity": PurchaseCounter.quantity + qty},
                        where=PurchaseCounter.quantity + qty <= item.per_user_limit,
                    )
                    result = await session.execute(claim)
                    if result.rowcount != 1:
                        raise HTTPException(409, f"Limit of {item.per_user_limit} per buyer reached for '{item.name}'")

                previous_stock = item.stock
                reservation = await session.execute(
                    update(Item)
                    .where(Item.id == item_id, Item.active.is_(True), Item.stock >= qty)
                    .values(stock=Item.stock - qty, sold=Item.sold + qty)
                )
                if reservation.rowcount != 1:
                    raise HTTPException(409, f"Insufficient stock for '{item.name}'")
                await session.refresh(item)

                unit_price = Decimal(item.price)
                order = Order(
                    buyer_id=user["id"],
                    item_id=item.id,
                    sku=item.sku,
                    item_name=item.name,
                    kind=item.kind,
                    quantity=qty,
                    unit_price=unit_price,
                    total=unit_price * qty,
                    status="confirmed",
                    created_at=now,
                )
                session.add(order)
                await session.flush()
                codes = []
                if item.kind == "ticket":
                    codes = [secrets.token_hex(4).upper() for _ in range(qty)]
                    session.add_all(
                        [TicketCode(code=code, order_id=order.id) for code in codes]
                    )
                alert = await _record_stock_alert(session, item, previous_stock)
                order_data = ser(order)
                order_data["ticket_codes"] = codes
                order_data["used_ticket_codes"] = []
                orders_data.append(order_data)
                broadcast_actions.append((item, alert))

    for item, alert in broadcast_actions:
        await _broadcast_stock_change(item, alert)

    return orders_data


async def cancel_order(order_id: str, user: dict) -> dict:
    alert = None
    async with database.SessionLocal() as session:
        async with session.begin():
            await session.execute(text("BEGIN IMMEDIATE"))
            order = await session.get(Order, order_id)
            if (
                not order
                or order.status != "confirmed"
                or (user["role"] != "organizer" and order.buyer_id != user["id"])
            ):
                raise HTTPException(404, "Order not found or not cancellable")
            used_ticket = await session.scalar(
                select(TicketCode.code).where(
                    TicketCode.order_id == order.id,
                    TicketCode.checked_in_at.is_not(None),
                ).limit(1)
            )
            if used_ticket:
                raise HTTPException(404, "Order not found or not cancellable")

            transition = await session.execute(
                update(Order)
                .where(Order.id == order.id, Order.status == "confirmed")
                .values(status="cancelled", cancelled_at=utcnow())
            )
            if transition.rowcount != 1:
                raise HTTPException(404, "Order not found or not cancellable")

            item = await session.get(Item, order.item_id)
            previous_stock = item.stock
            await session.execute(
                update(Item)
                .where(Item.id == item.id)
                .values(stock=Item.stock + order.quantity, sold=Item.sold - order.quantity)
            )
            await session.refresh(item)
            await session.execute(
                update(PurchaseCounter)
                .where(
                    PurchaseCounter.item_id == order.item_id,
                    PurchaseCounter.buyer_id == order.buyer_id,
                    PurchaseCounter.quantity >= order.quantity,
                )
                .values(quantity=PurchaseCounter.quantity - order.quantity)
            )
            alert = await _record_stock_alert(session, item, previous_stock)
            await session.refresh(order)
            order_data = ser(order)
            tickets = (
                await session.scalars(
                    select(TicketCode).where(TicketCode.order_id == order.id)
                )
            ).all()
            order_data["ticket_codes"] = [ticket.code for ticket in tickets]
            order_data["used_ticket_codes"] = [
                ticket.code for ticket in tickets if ticket.checked_in_at is not None
            ]

    await _broadcast_stock_change(item, alert)
    return order_data


async def check_in_ticket(ticket_code: str) -> dict:
    now = utcnow()
    async with database.SessionLocal() as session:
        async with session.begin():
            ticket = await session.get(TicketCode, ticket_code)
            if not ticket:
                raise HTTPException(404, "Ticket code not found or order is not active")
            order = await session.get(Order, ticket.order_id)
            if not order or order.status != "confirmed":
                raise HTTPException(404, "Ticket code not found or order is not active")
            if ticket.checked_in_at is not None:
                raise HTTPException(409, "Ticket has already been checked in")
            transition = await session.execute(
                update(TicketCode)
                .where(
                    TicketCode.code == ticket_code,
                    TicketCode.checked_in_at.is_(None),
                )
                .values(checked_in_at=now)
            )
            if transition.rowcount != 1:
                raise HTTPException(409, "Ticket has already been checked in")
            result = {
                "checked_in": True,
                "ticket_code": ticket_code,
                "item_name": order.item_name,
                "order_id": order.id,
                "checked_in_at": now.isoformat(),
            }
    return result
