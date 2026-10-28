from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import settings

client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


async def connect() -> None:
    global client, db
    # tz_aware so datetimes read back are timezone-aware (UTC)
    client = AsyncIOMotorClient(settings.MONGO_URL, tz_aware=True)
    db = client[settings.MONGO_DB]
    await db.users.create_index("email", unique=True)
    await db.items.create_index("sku", unique=True)
    await db.orders.create_index([("buyer_id", 1), ("created_at", -1)])
    await db.alerts.create_index([("created_at", -1)])


async def disconnect() -> None:
    if client:
        client.close()
