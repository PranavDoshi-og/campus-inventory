from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from . import database
from .routers import alerts, auth, items, orders, reports, ws


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


# Minimal live dashboard at "/" (mounted last so API routes win)
app.mount("/", StaticFiles(directory="static", html=True), name="static")
