import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_order_and_cancellation(client: AsyncClient, organizer_token: str, buyer_token: str):
    item = (await client.post(
        "/items",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={
            "sku": "ORDER-TEE-01",
            "name": "Graphic Campus Tee",
            "kind": "merch",
            "price": 20.0,
            "stock": 10,
            "per_user_limit": 3,
        },
    )).json()

    # Place order
    order_resp = await client.post(
        "/orders",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"item_id": item["id"], "quantity": 2},
    )
    assert order_resp.status_code == 201
    order = order_resp.json()
    assert order["quantity"] == 2
    assert order["total"] == 40.0
    assert order["status"] == "confirmed"

    # Stock decremented
    check_item = (await client.get(f"/items/{item['id']}", headers={"Authorization": f"Bearer {buyer_token}"})).json()
    assert check_item["stock"] == 8
    assert check_item["sold"] == 2

    # Buyer view order history
    my_orders = (await client.get("/orders/me", headers={"Authorization": f"Bearer {buyer_token}"})).json()
    assert any(o["id"] == order["id"] for o in my_orders)

    # Cancel order
    cancel_resp = await client.post(
        f"/orders/{order['id']}/cancel",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

    # Stock restored
    restored_item = (await client.get(f"/items/{item['id']}", headers={"Authorization": f"Bearer {buyer_token}"})).json()
    assert restored_item["stock"] == 10
    assert restored_item["sold"] == 0


@pytest.mark.asyncio
async def test_batch_cart_order(client: AsyncClient, organizer_token: str, buyer_token: str):
    it1 = (await client.post(
        "/items",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"sku": "BATCH-01", "name": "Item 1", "price": 10.0, "stock": 5},
    )).json()
    it2 = (await client.post(
        "/items",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"sku": "BATCH-02", "name": "Item 2", "price": 15.0, "stock": 5},
    )).json()

    batch_resp = await client.post(
        "/orders/batch",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "items": [
                {"item_id": it1["id"], "quantity": 2},
                {"item_id": it2["id"], "quantity": 1},
            ]
        },
    )
    assert batch_resp.status_code == 201
    orders = batch_resp.json()
    assert len(orders) == 2


@pytest.mark.asyncio
async def test_per_user_limit_enforced(client: AsyncClient, organizer_token: str, buyer_token: str):
    item = (await client.post(
        "/items",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={
            "sku": "LIMIT-ITEM-01",
            "name": "Limited Edition Cap",
            "price": 30.0,
            "stock": 50,
            "per_user_limit": 2,
        },
    )).json()

    # Buy 2 (allowed)
    r1 = await client.post(
        "/orders",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"item_id": item["id"], "quantity": 2},
    )
    assert r1.status_code == 201

    # Buy 1 more (fails per_user_limit)
    r2 = await client.post(
        "/orders",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"item_id": item["id"], "quantity": 1},
    )
    assert r2.status_code == 409
    assert "limit" in r2.json()["detail"].lower()

