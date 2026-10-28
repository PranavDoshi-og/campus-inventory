"""Flash-sale stress test: 60 buyers race for 10 units.

Expected: exactly 10 orders succeed, 50 get 409, final stock == 0, never negative.
Usage:  python scripts/flash_sale_test.py [http://localhost:8000]
"""
import asyncio
import sys
import uuid

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
ORGANIZER_CODE = "committee-2026"
STOCK, BUYERS = 10, 60


async def token(client: httpx.AsyncClient, email: str, code: str | None = None) -> str:
    await client.post("/auth/register", json={"name": email, "email": email, "password": "password123",
                                              "organizer_code": code})
    r = await client.post("/auth/login", data={"username": email, "password": "password123"})
    return r.json()["access_token"]


async def main():
    run = uuid.uuid4().hex[:6]
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as c:
        org = await token(c, f"org-{run}@test.dev", ORGANIZER_CODE)
        item = (await c.post("/items", headers={"Authorization": f"Bearer {org}"}, json={
            "sku": f"HOODIE-{run}", "name": "Flash Hoodie", "price": 25, "stock": STOCK,
            "low_stock_threshold": 3, "per_user_limit": 1})).json()
        tokens = await asyncio.gather(*[token(c, f"b{i}-{run}@test.dev") for i in range(BUYERS)])

        async def buy(t):
            r = await c.post("/orders", headers={"Authorization": f"Bearer {t}"},
                             json={"item_id": item["id"], "quantity": 1})
            return r.status_code

        codes = await asyncio.gather(*[buy(t) for t in tokens])
        final = (await c.get(f"/items/{item['id']}", headers={"Authorization": f"Bearer {org}"})).json()
        alerts = (await c.get("/alerts", headers={"Authorization": f"Bearer {org}"})).json()
        mine = [a for a in alerts if a["item_id"] == item["id"]]

    ok = codes.count(201)
    print(f"succeeded={ok} rejected={codes.count(409)} final_stock={final['stock']} sold={final['sold']}")
    print(f"alerts for item: {sorted(a['type'] for a in mine)}")
    assert ok == STOCK and final["stock"] == 0 and final["sold"] == STOCK, "OVERSELL DETECTED"
    assert sorted(a["type"] for a in mine) == ["low_stock", "sold_out"], "alert count wrong"
    print("PASS: no overselling, alerts fired exactly once")


asyncio.run(main())
