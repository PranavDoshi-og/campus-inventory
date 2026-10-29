from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import inspect


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def aware(dt: datetime | None) -> datetime | None:
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def oid(value: str) -> str:
    try:
        return UUID(value).hex
    except (ValueError, AttributeError):
        raise HTTPException(422, "Invalid id")


def ser(doc) -> dict | None:
    if doc is None:
        return None
    values = {}
    for attribute in inspect(doc).mapper.column_attrs:
        value = getattr(doc, attribute.key)
        if isinstance(value, Decimal):
            value = float(value)
        elif isinstance(value, datetime):
            value = value.isoformat()
        values[attribute.key] = value
    values["id"] = values.pop("id")
    return values
