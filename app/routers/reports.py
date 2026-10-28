from fastapi import APIRouter, Depends

from .. import database
from ..deps import organizer_only

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary")
async def summary(_: dict = Depends(organizer_only)):
    db = database.db
    by_item = await db.orders.aggregate([
        {"$match": {"status": "confirmed"}},
        {"$group": {"_id": "$sku", "units": {"$sum": "$quantity"}, "revenue": {"$sum": "$total"}}},
        {"$sort": {"revenue": -1}},
    ]).to_list(200)
    low = await db.items.find(
        {"$expr": {"$lte": ["$stock", "$low_stock_threshold"]}, "active": True},
        {"sku": 1, "name": 1, "stock": 1, "low_stock_threshold": 1},
    ).to_list(200)
    return {
        "total_revenue": round(sum(r["revenue"] for r in by_item), 2),
        "total_units": sum(r["units"] for r in by_item),
        "by_item": [{"sku": r["_id"], "units": r["units"], "revenue": round(r["revenue"], 2)} for r in by_item],
        "low_stock_items": [{"sku": i["sku"], "name": i["name"], "stock": i["stock"]} for i in low],
    }
