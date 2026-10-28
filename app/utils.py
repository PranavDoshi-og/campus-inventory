from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def aware(dt: datetime | None) -> datetime | None:
    """Treat naive datetimes from clients as UTC."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(422, "Invalid id")
    return ObjectId(value)


def ser(doc: dict | None) -> dict | None:
    """Mongo doc -> JSON-friendly dict (ObjectId -> str, _id -> id)."""
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if k == "_id":
            out["id"] = str(v)
        elif isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out
