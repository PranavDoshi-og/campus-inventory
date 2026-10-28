from fastapi import APIRouter, Depends, HTTPException

from .. import database
from ..deps import organizer_only
from ..utils import oid, ser

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
async def list_alerts(unacknowledged: bool = False, _: dict = Depends(organizer_only)):
    q = {"acknowledged": False} if unacknowledged else {}
    docs = await database.db.alerts.find(q).sort("created_at", -1).to_list(200)
    return [ser(d) for d in docs]


@router.post("/{alert_id}/ack")
async def acknowledge(alert_id: str, _: dict = Depends(organizer_only)):
    res = await database.db.alerts.update_one({"_id": oid(alert_id)}, {"$set": {"acknowledged": True}})
    if not res.matched_count:
        raise HTTPException(404, "Alert not found")
    return {"acknowledged": True}
