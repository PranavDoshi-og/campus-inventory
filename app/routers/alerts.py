from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .. import database
from ..deps import organizer_only
from ..models import Alert, Item
from ..schemas import AlertCreate, AlertUpdate
from ..utils import oid, ser, utcnow

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


@router.get("/{alert_id}")
async def get_alert(
    alert_id: str,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    alert = await session.get(Alert, oid(alert_id))
    if not alert:
        raise HTTPException(404, "Alert not found")
    return ser(alert)


@router.post("", status_code=201)
async def create_alert(
    body: AlertCreate,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    item = await session.get(Item, oid(body.item_id))
    if not item:
        raise HTTPException(404, "Item not found")

    alert = Alert(
        item_id=item.id,
        sku=item.sku,
        item_name=item.name,
        type=body.type,
        stock=body.stock,
        threshold=body.threshold,
        acknowledged=False,
        created_at=utcnow(),
    )
    session.add(alert)
    await session.commit()
    await session.refresh(alert)
    return ser(alert)


@router.patch("/{alert_id}")
async def update_alert(
    alert_id: str,
    body: AlertUpdate,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    result = await session.execute(
        update(Alert)
        .where(Alert.id == oid(alert_id))
        .values(acknowledged=body.acknowledged)
    )
    if not result.rowcount:
        raise HTTPException(404, "Alert not found")
    await session.commit()
    alert = await session.get(Alert, oid(alert_id))
    return ser(alert)


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


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    result = await session.execute(delete(Alert).where(Alert.id == oid(alert_id)))
    if not result.rowcount:
        raise HTTPException(404, "Alert not found")
    await session.commit()
    return {"deleted": True, "alert_id": alert_id}


@router.delete("")
async def clear_acknowledged_alerts(
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    result = await session.execute(delete(Alert).where(Alert.acknowledged.is_(True)))
    await session.commit()
    return {"deleted_count": result.rowcount, "message": f"Cleared {result.rowcount} acknowledged alerts."}
