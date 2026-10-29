"""Race 60 buyers for 10 units and verify SQL transaction invariants.

Usage: python scripts/flash_sale_test.py [http://localhost:8000]
"""
import asyncio
import sys
import uuid

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
ORGANIZER_CODE = "committee-2026"
STOCK, BUYERS = 10, 60


async def token(client: httpx.AsyncClient, email: str, code: str | None = None) -> str:
    response = await client.post(
        "/auth/register",
        json={
            "name": email,
            "email": email,
            "password": "password123",
            "organizer_code": code,
        },
    )
    if response.status_code != 201:
        raise RuntimeError(f"Could not register {email}: {response.status_code} {response.text}")
    response = await client.post(
        "/auth/login",
        data={"username": email, "password": "password123"},
    )
    response.raise_for_status()
    return response.json()["access_token"]


async def main():
    run = uuid.uuid4().hex[:8]
    async with httpx.AsyncClient(base_url=BASE, timeout=60) as client:
        organizer = await token(client, f"org-{run}@example.com", ORGANIZER_CODE)
        item_response = await client.post(
            "/items",
            headers={"Authorization": f"Bearer {organizer}"},
            json={
                "sku": f"FLASH-{run}",
                "name": "Flash Sale Test Item",
                "price": 25,
                "stock": STOCK,
                "low_stock_threshold": 3,
                "per_user_limit": 1,
            },
        )
        item_response.raise_for_status()
        item = item_response.json()
        tokens = [
            await token(client, f"buyer-{index}-{run}@example.com")
            for index in range(BUYERS)
        ]

        async def buy(access_token: str) -> int:
            response = await client.post(
                "/orders",
                headers={"Authorization": f"Bearer {access_token}"},
                json={"item_id": item["id"], "quantity": 1},
            )
            return response.status_code

        results = await asyncio.gather(*(buy(access_token) for access_token in tokens))
        final_response = await client.get(
            f"/items/{item['id']}",
            headers={"Authorization": f"Bearer {organizer}"},
        )
        final_response.raise_for_status()
        final = final_response.json()
        alert_response = await client.get(
            "/alerts",
            headers={"Authorization": f"Bearer {organizer}"},
        )
        alert_response.raise_for_status()
        alerts = [alert for alert in alert_response.json() if alert["item_id"] == item["id"]]

    succeeded = results.count(201)
    rejected = results.count(409)
    print(f"succeeded={succeeded} rejected={rejected} stock={final['stock']} sold={final['sold']}")
    print(f"alerts for item: {sorted(alert['type'] for alert in alerts)}")
    assert succeeded == STOCK and rejected == BUYERS - STOCK
    assert final["stock"] == 0 and final["sold"] == STOCK
    assert sorted(alert["type"] for alert in alerts) == ["low_stock", "sold_out"]
    print("PASS: no overselling, stock is consistent, and each threshold alert fired once")


if __name__ == "__main__":
    asyncio.run(main())
