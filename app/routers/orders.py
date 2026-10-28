from fastapi import APIRouter, Depends

from .. import database
from ..deps import buyer_only, current_user, organizer_only
from ..schemas import OrderIn, TicketCheckInIn
from ..services import cancel_order, check_in_ticket, place_order
from ..utils import oid, ser

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", status_code=201)
async def create_order(body: OrderIn, user: dict = Depends(buyer_only)):
    order = await place_order(oid(body.item_id), user, body.quantity)
    return ser(order)


@router.get("/me")
async def my_orders(user: dict = Depends(buyer_only)):
    docs = await database.db.orders.find({"buyer_id": user["_id"]}).sort("created_at", -1).to_list(200)
    return [ser(d) for d in docs]


@router.get("")
async def all_orders(item_id: str | None = None, _: dict = Depends(organizer_only)):
    q = {"item_id": oid(item_id)} if item_id else {}
    docs = await database.db.orders.find(q).sort("created_at", -1).to_list(500)
    buyer_ids = list({order["buyer_id"] for order in docs})
    buyers = await database.db.users.find(
        {"_id": {"$in": buyer_ids}},
        {"name": 1, "email": 1},
    ).to_list(len(buyer_ids))
    buyers_by_id = {buyer["_id"]: buyer for buyer in buyers}
    orders = []
    for doc in docs:
        order = ser(doc)
        buyer = buyers_by_id.get(doc["buyer_id"])
        order["buyer_name"] = buyer.get("name", "Campus buyer") if buyer else "Campus buyer"
        order["buyer_email"] = buyer.get("email") if buyer else None
        orders.append(order)
    return orders


@router.post("/check-in", tags=["ticketing"])
async def ticket_check_in(body: TicketCheckInIn, _: dict = Depends(organizer_only)):
    return await check_in_ticket(body.ticket_code.upper())


@router.post("/{order_id}/cancel")
async def cancel(order_id: str, user: dict = Depends(current_user)):
    return ser(await cancel_order(oid(order_id), user))
