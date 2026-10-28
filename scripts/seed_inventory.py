"""Add fictional campus merch and event listings to the configured MongoDB.

Existing listings are left untouched; repeated runs only insert missing SKUs.
Usage: python scripts/seed_inventory.py
"""
import asyncio
from datetime import timedelta
from pathlib import Path
import sys

from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.utils import utcnow


def sample_items(now):
    return [
        {
            "sku": "CAMPUS-TEE-001",
            "name": "Campus Field Notes Tee",
            "kind": "merch",
            "description": "A soft everyday tee for long lectures and longer lunch breaks.",
            "price": 24.0,
            "stock": 32,
            "low_stock_threshold": 6,
            "per_user_limit": None,
            "sale_starts_at": None,
            "sale_ends_at": None,
            "event_date": None,
        },
        {
            "sku": "CAMPUS-TOTE-001",
            "name": "Library Run Tote",
            "kind": "merch",
            "description": "Room for your notebook, water bottle, and one more book.",
            "price": 14.5,
            "stock": 18,
            "low_stock_threshold": 5,
            "per_user_limit": None,
            "sale_starts_at": None,
            "sale_ends_at": None,
            "event_date": None,
        },
        {
            "sku": "CAMPUS-MUG-001",
            "name": "Cedar Hall Study Mug",
            "kind": "merch",
            "description": "Your new favorite desk companion for early starts.",
            "price": 12.0,
            "stock": 4,
            "low_stock_threshold": 5,
            "per_user_limit": None,
            "sale_starts_at": None,
            "sale_ends_at": None,
            "event_date": None,
        },
        {
            "sku": "EVENT-WELCOME-001",
            "name": "Welcome Night on the Quad",
            "kind": "ticket",
            "description": "An evening of music, food, and meeting your campus community.",
            "price": 8.0,
            "stock": 80,
            "low_stock_threshold": 12,
            "per_user_limit": 4,
            "sale_starts_at": None,
            "sale_ends_at": None,
            "event_date": now + timedelta(days=14),
        },
        {
            "sku": "EVENT-MAKERS-001",
            "name": "Makers on the Quad",
            "kind": "ticket",
            "description": "An afternoon of student-made art, crafts, and good company.",
            "price": 5.0,
            "stock": 60,
            "low_stock_threshold": 10,
            "per_user_limit": 4,
            "sale_starts_at": None,
            "sale_ends_at": None,
            "event_date": now + timedelta(days=28),
        },
        {
            "sku": "EVENT-OPENMIC-001",
            "name": "Open Mic Under the Stars",
            "kind": "ticket",
            "description": "A laid-back evening for songs, stories, and campus talent.",
            "price": 3.5,
            "stock": 42,
            "low_stock_threshold": 8,
            "per_user_limit": 4,
            "sale_starts_at": None,
            "sale_ends_at": None,
            "event_date": now + timedelta(days=42),
        },
    ]


async def main():
    client = AsyncIOMotorClient(settings.MONGO_URL, tz_aware=True)
    try:
        db = client[settings.MONGO_DB]
        await db.items.create_index("sku", unique=True)
        now = utcnow()
        inserted = 0
        for item in sample_items(now):
            item.update(sold=0, active=True, created_at=now)
            result = await db.items.update_one(
                {"sku": item["sku"]},
                {"$setOnInsert": item},
                upsert=True,
            )
            inserted += result.upserted_id is not None
        print(f"Added {inserted} sample listings; existing sample SKUs were left unchanged.")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
