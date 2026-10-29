"""One-time, all-or-nothing import of the former MongoDB application data.

Usage:
    python scripts/migrate_mongo_to_sql.py --mongo-uri mongodb://localhost:27017
"""
import argparse
import asyncio
from datetime import datetime
from decimal import Decimal
from pathlib import Path
import sys
from uuid import uuid4

from pymongo import MongoClient
from sqlalchemy import func, select

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import database
from app.models import Alert, Item, Order, PurchaseCounter, TicketCode, User
from app.utils import aware, utcnow


def new_id() -> str:
    return uuid4().hex


def migrated_time(value: datetime | None) -> datetime:
    return aware(value) if value else utcnow()


async def import_documents(args) -> None:
    mongo = MongoClient(args.mongo_uri)
    source = mongo[args.mongo_db]
    await database.connect()
    try:
        async with database.SessionLocal() as session:
            async with session.begin():
                target_models = (User, Item, Order, TicketCode, PurchaseCounter, Alert)
                existing = {}
                for model in target_models:
                    existing[model.__tablename__] = await session.scalar(
                        select(func.count()).select_from(model)
                    )
                if any(existing.values()):
                    raise RuntimeError(
                        "SQL target is not empty. Use a fresh DATABASE_URL before importing."
                    )

                users = list(source.users.find())
                items = list(source.items.find())
                orders = list(source.orders.find())
                alerts = list(source.alerts.find())
                counters = list(source.purchase_counters.find())

                ids = {}
                for collection in (users, items, orders, alerts):
                    for document in collection:
                        ids[str(document["_id"])] = new_id()

                organizer = next(
                    (document for document in users if document.get("role") == "organizer"),
                    None,
                )
                if organizer is None and (users or items):
                    organizer_id = new_id()
                    session.add(User(
                        id=organizer_id,
                        name="Legacy data migration",
                        email=f"migration-{uuid4().hex}@example.invalid",
                        password_hash="migration-only-account-cannot-sign-in",
                        role="organizer",
                        created_at=utcnow(),
                    ))
                else:
                    organizer_id = ids[str(organizer["_id"])] if organizer else None

                session.add_all([
                    User(
                        id=ids[str(user["_id"])],
                        name=user["name"],
                        email=user["email"].lower(),
                        password_hash=user["password_hash"],
                        role=user.get("role", "buyer"),
                        created_at=migrated_time(user.get("created_at")),
                    )
                    for user in users
                ])
                for item in items:
                    created_by = item.get("created_by")
                    session.add(Item(
                        id=ids[str(item["_id"])],
                        sku=item["sku"],
                        name=item["name"],
                        kind=item.get("kind", "merch"),
                        description=item.get("description", ""),
                        price=Decimal(str(item.get("price", 0))),
                        stock=item.get("stock", 0),
                        sold=item.get("sold", 0),
                        low_stock_threshold=item.get("low_stock_threshold", 5),
                        per_user_limit=item.get("per_user_limit"),
                        sale_starts_at=aware(item.get("sale_starts_at")),
                        sale_ends_at=aware(item.get("sale_ends_at")),
                        event_date=aware(item.get("event_date")),
                        active=item.get("active", True),
                        created_by=ids.get(str(created_by), organizer_id),
                        created_at=migrated_time(item.get("created_at")),
                    ))
                for order in orders:
                    order_id = ids[str(order["_id"])]
                    session.add(Order(
                        id=order_id,
                        buyer_id=ids[str(order["buyer_id"])],
                        item_id=ids[str(order["item_id"])],
                        sku=order["sku"],
                        item_name=order["item_name"],
                        kind=order.get("kind", "merch"),
                        quantity=order["quantity"],
                        unit_price=Decimal(str(order.get("unit_price", 0))),
                        total=Decimal(str(order.get("total", 0))),
                        status=order.get("status", "confirmed"),
                        created_at=migrated_time(order.get("created_at")),
                        cancelled_at=aware(order.get("cancelled_at")),
                    ))
                    for code in order.get("ticket_codes", []):
                        checked_in = code in order.get("used_ticket_codes", [])
                        session.add(TicketCode(
                            code=code.upper(),
                            order_id=order_id,
                            checked_in_at=(
                                migrated_time(order.get("last_checked_in_at"))
                                if checked_in else None
                            ),
                        ))
                for counter in counters:
                    old_item_id, old_buyer_id = counter["_id"].split(":", 1)
                    session.add(PurchaseCounter(
                        item_id=ids[old_item_id],
                        buyer_id=ids[old_buyer_id],
                        quantity=counter.get("qty", 0),
                    ))
                for alert in alerts:
                    session.add(Alert(
                        id=ids[str(alert["_id"])],
                        item_id=ids[str(alert["item_id"])],
                        sku=alert["sku"],
                        item_name=alert["item_name"],
                        type=alert["type"],
                        stock=alert["stock"],
                        threshold=alert["threshold"],
                        acknowledged=alert.get("acknowledged", False),
                        created_at=migrated_time(alert.get("created_at")),
                    ))

                await session.flush()
                print(
                    "Imported "
                    f"{len(users)} users, {len(items)} items, {len(orders)} orders, "
                    f"{sum(len(order.get('ticket_codes', [])) for order in orders)} tickets, "
                    f"{len(counters)} purchase counters, and {len(alerts)} alerts."
                )
    finally:
        mongo.close()
        await database.disconnect()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mongo-uri", required=True)
    parser.add_argument("--mongo-db", default="campus_inventory")
    asyncio.run(import_documents(parser.parse_args()))


if __name__ == "__main__":
    main()
