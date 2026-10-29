from collections.abc import AsyncIterator
from pathlib import Path

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.asyncio.engine import AsyncEngine

from .config import settings
from .models import Base

database_url = settings.DATABASE_URL
if not database_url.startswith("sqlite+aiosqlite:///"):
    raise RuntimeError(
        "This application currently supports SQLite via aiosqlite; "
        "other SQL dialects need dialect-specific transaction support."
    )
if database_url.startswith("sqlite+aiosqlite:///"):
    database_path = database_url.removeprefix("sqlite+aiosqlite:///")
    if database_path and database_path != ":memory:" and not database_path.startswith("/"):
        Path(database_path).parent.mkdir(parents=True, exist_ok=True)

engine: AsyncEngine = create_async_engine(
    database_url,
    connect_args={"timeout": 30} if database_url.startswith("sqlite") else {},
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


if database_url.startswith("sqlite"):
    @event.listens_for(engine.sync_engine, "connect")
    def enable_sqlite_constraints(connection, _record) -> None:
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()


async def connect() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(
            lambda sync_connection: [
                index.create(sync_connection, checkfirst=True)
                for table in Base.metadata.tables.values()
                for index in table.indexes
            ]
        )
        await connection.exec_driver_sql(
            """CREATE VIEW IF NOT EXISTS sales_by_item AS
            SELECT sku, SUM(quantity) AS units, SUM(total) AS revenue
            FROM orders WHERE status = 'confirmed' GROUP BY sku"""
        )
        await connection.exec_driver_sql(
            """CREATE VIEW IF NOT EXISTS low_stock_items AS
            SELECT id, sku, name, stock, low_stock_threshold
            FROM items WHERE active = 1 AND stock <= low_stock_threshold"""
        )


async def disconnect() -> None:
    await engine.dispose()


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
