from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import database
from .routers import alerts, auth, items, orders, reports, ws

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
FRONTEND_ROUTES = {
    "/",
    "/login",
    "/register",
    "/shop",
    "/my-orders",
    "/organizer",
    "/organizer/inventory",
    "/organizer/orders",
    "/organizer/check-in",
    "/organizer/alerts",
    "/organizer/reports",
    "/organizer/database",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.connect()
    yield
    await database.disconnect()


app = FastAPI(title="Campus Merchandise & Event Inventory Tracker", lifespan=lifespan)

for r in (auth, items, orders, alerts, reports, ws):
    app.include_router(r.router)


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok"}


app.mount("/assets", StaticFiles(directory=str(STATIC_DIR)), name="assets")


@app.get("/", include_in_schema=False)
async def frontend_home():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/{path:path}", include_in_schema=False)
async def frontend_route(path: str):
    route = "/" + path.rstrip("/")
    if route not in FRONTEND_ROUTES:
        raise HTTPException(404, "Not found")
    return FileResponse(STATIC_DIR / "index.html")
