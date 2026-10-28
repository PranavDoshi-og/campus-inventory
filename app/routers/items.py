from fastapi import APIRouter, Depends, HTTPException
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from .. import database
from ..deps import current_user, organizer_only
from ..schemas import ItemCreate, ItemUpdate, RestockIn
from ..services import emit_stock_update, check_stock_alerts
from ..utils import aware, oid, ser, utcnow

router = APIRouter(prefix="/items", tags=["items"])


@router.get("")
async def list_items(kind: str | None = None, user: dict = Depends(current_user)):
    q: dict = {}
    if kind:
        q["kind"] = kind
    if user["role"] != "organizer":
        q["active"] = True  # buyers only see items on sale
    docs = await database.db.items.find(q).sort("name", 1).to_list(500)
    return [ser(d) for d in docs]


@router.get("/{item_id}")
async def get_item(item_id: str, user: dict = Depends(current_user)):
    item = await database.db.items.find_one({"_id": oid(item_id)})
    if not item or (not item["active"] and user["role"] != "organizer"):
        raise HTTPException(404, "Item not found")
    return ser(item)


@router.post("", status_code=201)
async def create_item(body: ItemCreate, user: dict = Depends(organizer_only)):
    doc = body.model_dump()
    doc["sale_starts_at"] = aware(doc["sale_starts_at"])
    doc["sale_ends_at"] = aware(doc["sale_ends_at"])
    doc["event_date"] = aware(doc["event_date"])
    doc.update(sold=0, active=True, created_by=user["_id"], created_at=utcnow())
    try:
        res = await database.db.items.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(409, "SKU already exists")
    doc["_id"] = res.inserted_id
    await emit_stock_update(doc)
    return ser(doc)


@router.patch("/{item_id}")
async def update_item(item_id: str, body: ItemUpdate, _: dict = Depends(organizer_only)):
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(422, "No fields to update")
    for k in ("sale_starts_at", "sale_ends_at"):
        if k in changes:
            changes[k] = aware(changes[k])
    item = await database.db.items.find_one_and_update(
        {"_id": oid(item_id)}, {"$set": changes}, return_document=ReturnDocument.AFTER
    )
    if not item:
        raise HTTPException(404, "Item not found")
    await emit_stock_update(item)
    return ser(item)


@router.post("/{item_id}/restock")
async def restock(item_id: str, body: RestockIn, _: dict = Depends(organizer_only)):
    """Atomic adjust. Negative deltas can never push stock below zero."""
    filt: dict = {"_id": oid(item_id)}
    if body.delta < 0:
        filt["stock"] = {"$gte": -body.delta}
    item = await database.db.items.find_one_and_update(
        filt, {"$inc": {"stock": body.delta}}, return_document=ReturnDocument.AFTER
    )
    if not item:
        raise HTTPException(409, "Item not found or write-off exceeds current stock")
    await emit_stock_update(item)
    await check_stock_alerts(item, previous_stock=item["stock"] - body.delta)
    return ser(item)
