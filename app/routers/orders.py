from fastapi import APIRouter, Depends

from .. import database
from ..deps import buyer_only, current_user, organizer_only
from ..schemas import OrderIn
from ..services import cancel_order, place_order
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
    return [ser(d) for d in docs]


@router.post("/{order_id}/cancel")
async def cancel(order_id: str, user: dict = Depends(current_user)):
    return ser(await cancel_order(oid(order_id), user))
