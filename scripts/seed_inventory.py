"""Insert fictional sample merchandise and events into the configured SQL database."""
import asyncio
import secrets
from datetime import timedelta
from decimal import Decimal
from pathlib import Path
import sys

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import database
from app.models import Item, User
from app.security import hash_password
from app.utils import utcnow


async def main():
    await database.connect()
    try:
        async with database.SessionLocal() as session:
            async with session.begin():
                organizer = await session.scalar(
                    select(User).where(User.role == "organizer").order_by(User.created_at)
                )
                if not organizer:
                    organizer = User(
                        name="Campus Committee",
                        email="committee@example.invalid",
                        password_hash=hash_password(secrets.token_urlsafe(32)),
                        role="organizer",
                        created_at=utcnow(),
                    )
                    session.add(organizer)
                    await session.flush()

                now = utcnow()
                examples = [
                    ("CAMPUS-TEE-001", "Campus Field Notes Tee", "merch",
                     "A soft everyday tee for long lectures and longer lunch breaks.", "24.00", 32, 6, None, None),
                    ("CAMPUS-TOTE-001", "Library Run Tote", "merch",
                     "Room for your notebook, water bottle, and one more book.", "14.50", 18, 5, None, None),
                    ("CAMPUS-MUG-001", "Cedar Hall Study Mug", "merch",
                     "Your new favorite desk companion for early starts.", "12.00", 4, 5, None, None),
                    ("EVENT-WELCOME-001", "Welcome Night on the Quad", "ticket",
                     "An evening of music, food, and meeting your campus community.", "8.00", 80, 12, 4, 14),
                    ("EVENT-MAKERS-001", "Makers on the Quad", "ticket",
                     "An afternoon of student-made art, crafts, and good company.", "5.00", 60, 10, 4, 28),
                    ("EVENT-OPENMIC-001", "Open Mic Under the Stars", "ticket",
                     "A laid-back evening for songs, stories, and campus talent.", "3.50", 42, 8, 4, 42),
                ]
                inserted = 0
                for sku, name, kind, description, price, stock, threshold, limit, days in examples:
                    existing = await session.scalar(select(Item.id).where(Item.sku == sku))
                    if existing:
                        continue
                    session.add(Item(
                        sku=sku,
                        name=name,
                        kind=kind,
                        description=description,
                        price=Decimal(price),
                        stock=stock,
                        sold=0,
                        low_stock_threshold=threshold,
                        per_user_limit=limit,
                        event_date=now + timedelta(days=days) if days else None,
                        active=True,
                        created_by=organizer.id,
                        created_at=now,
                    ))
                    inserted += 1
            print(f"Added {inserted} sample listings; existing sample SKUs were left unchanged.")
    finally:
        await database.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
