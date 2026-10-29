from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .. import database
from ..deps import organizer_only
from ..models import Alert
from ..utils import oid, ser

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
async def list_alerts(
    unacknowledged: bool = False,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    query = select(Alert)
    if unacknowledged:
        query = query.where(Alert.acknowledged.is_(False))
    docs = (await session.scalars(query.order_by(Alert.created_at.desc()).limit(200))).all()
    return [ser(alert) for alert in docs]


@router.post("/{alert_id}/ack")
async def acknowledge(
    alert_id: str,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    result = await session.execute(
        update(Alert).where(Alert.id == oid(alert_id)).values(acknowledged=True)
    )
    if not result.rowcount:
        raise HTTPException(404, "Alert not found")
    await session.commit()
    return {"acknowledged": True}
