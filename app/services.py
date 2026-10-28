"""Business logic: atomic order placement, cancellation, and stock alerts."""
import secrets

from fastapi import HTTPException
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from . import database
from .realtime import manager
from .utils import ser, utcnow


# --------------------------------------------------------------------------- #
# Real-time + alerts
# --------------------------------------------------------------------------- #
async def emit_stock_update(item: dict) -> None:
    await manager.broadcast({
        "type": "stock_update",
        "item_id": str(item["_id"]),
        "sku": item["sku"],
        "stock": item["stock"],
        "sold": item.get("sold", 0),
        "active": item.get("active", True),
    })


async def check_stock_alerts(item: dict, previous_stock: int) -> None:
    """Fire an alert exactly once per threshold crossing.

    Every atomic decrement returns a unique post-update stock value, so only
    the one request that moves stock across the threshold sees prev > thr >= new,
    even when hundreds of orders race.
    """
    new, thr = item["stock"], item.get("low_stock_threshold", 0)
    kind = None
    if new == 0 and previous_stock > 0:
        kind = "sold_out"
    elif previous_stock > thr >= new:
        kind = "low_stock"
    if not kind:
        return
    alert = {
        "type": kind,
        "item_id": item["_id"],
        "sku": item["sku"],
        "item_name": item["name"],
        "stock": new,
        "threshold": thr,
        "acknowledged": False,
        "created_at": utcnow(),
    }
    res = await database.db.alerts.insert_one(alert)
    alert["_id"] = res.inserted_id
    await manager.broadcast({"type": "alert", "alert": ser(alert)}, roles={"organizer"})


# --------------------------------------------------------------------------- #
# Orders
# --------------------------------------------------------------------------- #
async def place_order(item_id, user: dict, qty: int) -> dict:
    db = database.db
    now = utcnow()
    item = await db.items.find_one({"_id": item_id})
    if not item or not item["active"]:
        raise HTTPException(404, "Item not available")
    if item.get("sale_starts_at") and now < item["sale_starts_at"]:
        raise HTTPException(409, "Sale has not started yet")
    if item.get("sale_ends_at") and now > item["sale_ends_at"]:
        raise HTTPException(409, "Sale has ended")

    # Step 1 - per-buyer limit, claimed atomically (blocks double-tap / bot bursts).
    limit = item.get("per_user_limit")
    counter_id = f"{item_id}:{user['_id']}"
    if limit:
        if qty > limit:
            raise HTTPException(409, f"Limit is {limit} per buyer")
        try:
            # Matches only if qty + new qty <= limit. If the doc exists but the
            # condition fails, upsert tries to insert the same _id -> DuplicateKeyError.
            await db.purchase_counters.update_one(
                {"_id": counter_id, "qty": {"$lte": limit - qty}},
                {"$inc": {"qty": qty}},
                upsert=True,
            )
        except DuplicateKeyError:
            raise HTTPException(409, f"Limit of {limit} per buyer reached")

    # Step 2 - reserve stock. The filter and the decrement are ONE atomic
    # MongoDB operation, so stock can never go negative and no lock is needed.
    updated = await db.items.find_one_and_update(
        {"_id": item_id, "active": True, "stock": {"$gte": qty}},
        {"$inc": {"stock": -qty, "sold": qty}},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        if limit:  # roll back the limit claim
            await db.purchase_counters.update_one({"_id": counter_id}, {"$inc": {"qty": -qty}})
        raise HTTPException(409, "Insufficient stock")

    # Step 3 - record the order; compensate if that fails.
    order = {
        "item_id": item_id,
        "sku": updated["sku"],
        "item_name": updated["name"],
        "kind": updated["kind"],
        "buyer_id": user["_id"],
        "quantity": qty,
        "unit_price": updated["price"],
        "total": round(updated["price"] * qty, 2),
        "status": "confirmed",
        "created_at": now,
    }
    if updated["kind"] == "ticket":
        order["ticket_codes"] = [secrets.token_hex(4).upper() for _ in range(qty)]
    try:
        res = await db.orders.insert_one(order)
    except Exception:
        await db.items.update_one({"_id": item_id}, {"$inc": {"stock": qty, "sold": -qty}})
        if limit:
            await db.purchase_counters.update_one({"_id": counter_id}, {"$inc": {"qty": -qty}})
        raise HTTPException(500, "Could not record order; stock restored")
    order["_id"] = res.inserted_id

    await emit_stock_update(updated)
    await check_stock_alerts(updated, previous_stock=updated["stock"] + qty)
    return order


async def cancel_order(order_id, user: dict) -> dict:
    db = database.db
    filt = {"_id": order_id, "status": "confirmed"}
    if user["role"] != "organizer":
        filt["buyer_id"] = user["_id"]
    # Atomic state transition: only one cancel can ever win.
    order = await db.orders.find_one_and_update(
        filt,
        {"$set": {"status": "cancelled", "cancelled_at": utcnow()}},
        return_document=ReturnDocument.AFTER,
    )
    if not order:
        raise HTTPException(404, "Order not found or not cancellable")
    item = await db.items.find_one_and_update(
        {"_id": order["item_id"]},
        {"$inc": {"stock": order["quantity"], "sold": -order["quantity"]}},
        return_document=ReturnDocument.AFTER,
    )
    await db.purchase_counters.update_one(
        {"_id": f"{order['item_id']}:{order['buyer_id']}"}, {"$inc": {"qty": -order["quantity"]}}
    )
    if item:
        await emit_stock_update(item)
    return order
