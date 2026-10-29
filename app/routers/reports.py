import csv
from datetime import datetime
from decimal import Decimal
import io
import re
import time

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from .. import database
from ..deps import organizer_only
from ..models import Alert, Base, Item, Order, PurchaseCounter, TicketCode, User
from ..schemas import SqlQueryIn
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
    total_orders = await session.scalar(
        select(func.count(Order.id)).where(Order.status == "confirmed")
    ) or 0
    total_revenue = round(sum(float(row["revenue"]) for row in rows), 2)
    total_units = sum(row["units"] for row in rows)
    avg_order_value = round(total_revenue / total_orders, 2) if total_orders else 0.0

    return {
        "total_revenue": total_revenue,
        "total_units": total_units,
        "total_orders": total_orders,
        "avg_order_value": avg_order_value,
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

    preset_queries = [
        {
            "name": "Top 5 Revenue by Item (View & Aggregates)",
            "query": "SELECT sku, units, revenue FROM sales_by_item ORDER BY revenue DESC LIMIT 5;",
            "description": "Reads directly from the SQL materialized/predefined view sales_by_item.",
        },
        {
            "name": "Tickets & Check-in Redemption Rate",
            "query": """SELECT
    i.name AS event_name,
    COUNT(t.code) AS total_issued,
    COUNT(t.checked_in_at) AS checked_in,
    ROUND(COUNT(t.checked_in_at) * 100.0 / MAX(COUNT(t.code), 1), 1) || '%' AS checkin_rate
FROM ticket_codes t
JOIN orders o ON t.order_id = o.id
JOIN items i ON o.item_id = i.id
WHERE o.status = 'confirmed'
GROUP BY i.name;""",
            "description": "Relational JOIN across 3 tables computing check-in attendance percentages.",
        },
        {
            "name": "Low Stock Inventory View",
            "query": "SELECT sku, name, stock, low_stock_threshold FROM low_stock_items ORDER BY stock ASC;",
            "description": "Inspects items triggering low-stock threshold alerts via SQL view.",
        },
        {
            "name": "Buyer Purchasing Summary (JOIN & COUNT)",
            "query": """SELECT
    u.name AS buyer_name,
    u.email,
    COUNT(o.id) AS total_orders,
    SUM(o.quantity) AS total_items,
    ROUND(SUM(o.total), 2) AS total_spent
FROM users u
JOIN orders o ON u.id = o.buyer_id
WHERE o.status = 'confirmed'
GROUP BY u.id
ORDER BY total_spent DESC
LIMIT 10;""",
            "description": "Aggregate customer value and order frequencies across users and orders.",
        },
        {
            "name": "Recent Unacknowledged Alerts",
            "query": "SELECT type, sku, item_name, stock, threshold, created_at FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC LIMIT 10;",
            "description": "Fetches active stock alerts using indexed filter on acknowledged status.",
        },
    ]

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
        "preset_queries": preset_queries,
    }


@router.post("/query")
async def run_query(
    body: SqlQueryIn,
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    sql = body.query.strip()
    clean_sql = re.sub(r"--.*", "", sql)
    clean_sql = re.sub(r"/\*.*?\*/", "", clean_sql, flags=re.DOTALL).strip()
    first_word = clean_sql.split()[0].upper() if clean_sql else ""
    if first_word not in ("SELECT", "WITH", "EXPLAIN"):
        raise HTTPException(
            400,
            "Only read-only SELECT, WITH, or EXPLAIN queries are permitted in the Database Lab.",
        )
    forbidden = {"DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE", "TRUNCATE", "REPLACE", "ATTACH", "DETACH", "PRAGMA"}
    tokens = set(re.findall(r"\b[A-Za-z_]+\b", clean_sql.upper()))
    intersection = tokens.intersection(forbidden)
    if intersection:
        raise HTTPException(
            400,
            f"Query contains restricted modification keywords: {', '.join(sorted(intersection))}",
        )

    start_time = time.perf_counter()
    try:
        result = await session.execute(text(clean_sql))
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        columns = list(result.keys()) if result.returns_rows else []
        rows = []
        if result.returns_rows:
            raw_rows = result.fetchmany(100)
            for r in raw_rows:
                rows.append([
                    float(val) if isinstance(val, Decimal)
                    else val.isoformat() if isinstance(val, datetime)
                    else val
                    for val in r
                ])
        return {
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "execution_time_ms": duration_ms,
        }
    except Exception as exc:
        raise HTTPException(400, f"SQL execution error: {str(exc)}")


@router.get("/export/orders.csv")
async def export_orders_csv(
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    query = (
        select(Order, User.name, User.email)
        .join(User, Order.buyer_id == User.id)
        .order_by(Order.created_at.desc())
    )
    rows = (await session.execute(query)).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Order ID", "Date", "Buyer Name", "Buyer Email",
        "SKU", "Item Name", "Kind", "Quantity", "Unit Price", "Total", "Status"
    ])
    for order, buyer_name, buyer_email in rows:
        writer.writerow([
            order.id,
            order.created_at.isoformat() if order.created_at else "",
            buyer_name,
            buyer_email,
            order.sku,
            order.item_name,
            order.kind,
            order.quantity,
            float(order.unit_price),
            float(order.total),
            order.status,
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="campus_orders.csv"'},
    )


@router.get("/export/inventory.csv")
async def export_inventory_csv(
    _: dict = Depends(organizer_only),
    session: AsyncSession = Depends(database.get_session),
):
    items = (await session.scalars(select(Item).order_by(Item.name))).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "SKU", "Name", "Kind", "Price", "Stock", "Sold",
        "Low Stock Threshold", "Per User Limit", "Active", "Created At"
    ])
    for item in items:
        writer.writerow([
            item.sku,
            item.name,
            item.kind,
            float(item.price),
            item.stock,
            item.sold,
            item.low_stock_threshold,
            item.per_user_limit or "",
            item.active,
            item.created_at.isoformat() if item.created_at else "",
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="campus_inventory.csv"'},
    )
