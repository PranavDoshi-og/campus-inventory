from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from .. import database
from ..deps import organizer_only
from ..models import Alert, Base, Item, Order, PurchaseCounter, TicketCode, User
from ..utils import utcnow

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary")
async def summary(
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    rows = (
        await session.execute(
            text("SELECT sku, units, revenue FROM sales_by_item ORDER BY revenue DESC LIMIT 200")
        )
    ).mappings().all()
    low = (
        await session.execute(
            text("SELECT sku, name, stock FROM low_stock_items ORDER BY stock, name LIMIT 200")
        )
    ).mappings().all()
    return {
        "total_revenue": round(sum(float(row["revenue"]) for row in rows), 2),
        "total_units": sum(row["units"] for row in rows),
        "by_item": [
            {"sku": row["sku"], "units": row["units"], "revenue": round(float(row["revenue"]), 2)}
            for row in rows
        ],
        "low_stock_items": [
            {"sku": item["sku"], "name": item["name"], "stock": item["stock"]}
            for item in low
        ],
    }


@router.get("/database")
async def database_overview(
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    models = (User, Item, Order, TicketCode, PurchaseCounter, Alert)
    tables = {}
    for model in models:
        tables[model.__tablename__] = await session.scalar(
            select(func.count()).select_from(model)
        )
    order_status = (
        await session.execute(
            select(Order.status, func.count().label("count"))
            .group_by(Order.status)
            .order_by(Order.status)
        )
    ).all()
    item_kinds = (
        await session.execute(
            select(Item.kind, func.count().label("count"))
            .group_by(Item.kind)
            .order_by(Item.kind)
        )
    ).all()
    schema = []
    for table in Base.metadata.sorted_tables:
        schema.append({
            "name": table.name,
            "columns": [
                {
                    "name": column.name,
                    "type": str(column.type),
                    "nullable": column.nullable,
                    "primary_key": column.primary_key,
                    "foreign_key": next(iter(column.foreign_keys)).target_fullname
                    if column.foreign_keys else None,
                }
                for column in table.columns
            ],
            "constraints": [
                constraint.name or type(constraint).__name__
                for constraint in table.constraints
            ],
            "indexes": [
                {"name": index.name, "unique": index.unique}
                for index in table.indexes
            ],
        })
    return {
        "generated_at": utcnow().isoformat(),
        "engine": database.engine.url.get_backend_name(),
        "tables": tables,
        "views": ["sales_by_item", "low_stock_items"],
        "order_status": [{"name": name, "count": count} for name, count in order_status],
        "item_kinds": [{"name": name, "count": count} for name, count in item_kinds],
        "schema": schema,
        "relationships": [
            {"from": "items.created_by", "to": "users.id", "cardinality": "one-to-many"},
            {"from": "orders.buyer_id", "to": "users.id", "cardinality": "one-to-many"},
            {"from": "orders.item_id", "to": "items.id", "cardinality": "one-to-many"},
            {"from": "ticket_codes.order_id", "to": "orders.id", "cardinality": "one-to-many"},
            {"from": "alerts.item_id", "to": "items.id", "cardinality": "one-to-many"},
            {"from": "purchase_counters.item_id + buyer_id", "to": "items + users", "cardinality": "composite key"},
        ],
    }
