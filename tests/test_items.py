import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_items(client: AsyncClient, organizer_token: str, buyer_token: str):
    sku = "TEST-HOODIE-001"
    create_resp = await client.post(
        "/items",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={
            "sku": sku,
            "name": "Varsity Zip Hoodie",
            "kind": "merch",
            "description": "Fleece varsity hoodie with campus embroidery.",
            "price": 45.0,
            "stock": 25,
            "low_stock_threshold": 5,
            "per_user_limit": 2,
        },
    )
    assert create_resp.status_code == 201
    item = create_resp.json()
    assert item["sku"] == sku
    assert item["stock"] == 25
    item_id = item["id"]

    # Buyers can list items
    list_resp = await client.get("/items", headers={"Authorization": f"Bearer {buyer_token}"})
    assert list_resp.status_code == 200
    skus = [it["sku"] for it in list_resp.json()]
    assert sku in skus

    # Buyer cannot create items
    forbidden = await client.post(
        "/items",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"sku": "FAIL-01", "name": "Fail", "price": 10, "stock": 5},
    )
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_restock_item(client: AsyncClient, organizer_token: str):
    sku = "RESTOCK-ITEM-001"
    item = (await client.post(
        "/items",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={
            "sku": sku,
            "name": "Restock Mug",
            "price": 12.0,
            "stock": 10,
            "low_stock_threshold": 3,
        },
    )).json()

    restock_resp = await client.post(
        f"/items/{item['id']}/restock",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"delta": 15},
    )
    assert restock_resp.status_code == 200
    assert restock_resp.json()["stock"] == 25

    # Negative write-off within limits
    writeoff_resp = await client.post(
        f"/items/{item['id']}/restock",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"delta": -5},
    )
    assert writeoff_resp.status_code == 200
    assert writeoff_resp.json()["stock"] == 20

    # Write-off exceeding stock fails
    excess_resp = await client.post(
        f"/items/{item['id']}/restock",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"delta": -999},
    )
    assert excess_resp.status_code == 409


@pytest.mark.asyncio
async def test_item_filters_and_search(client: AsyncClient, organizer_token: str):
    resp = await client.get(
        "/items",
        params={"search": "Varsity", "kind": "merch"},
        headers={"Authorization": f"Bearer {organizer_token}"},
    )
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) >= 1
    assert any("Varsity" in it["name"] for it in results)

