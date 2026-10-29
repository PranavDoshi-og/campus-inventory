import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_recommendations_cold_start(client: AsyncClient, buyer_token: str):
    resp = await client.get(
        "/items/recommendations",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert resp.status_code == 200
    recs = resp.json()
    assert isinstance(recs, list)
    if recs:
        assert "recommendation_reason" in recs[0]
        assert "id" in recs[0]


@pytest.mark.asyncio
async def test_recommendations_after_purchase(client: AsyncClient, organizer_token: str, buyer_token: str):
    # Create two items in same category
    item1 = (await client.post(
        "/items",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"sku": "REC-TEE-1", "name": "Rec Tee 1", "kind": "merch", "price": 20, "stock": 10},
    )).json()

    item2 = (await client.post(
        "/items",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"sku": "REC-TEE-2", "name": "Rec Tee 2", "kind": "merch", "price": 22, "stock": 10},
    )).json()

    # Buyer buys item1
    order_resp = await client.post(
        "/orders",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"item_id": item1["id"], "quantity": 1},
    )
    assert order_resp.status_code == 201

    # Check recommendations
    resp = await client.get(
        "/items/recommendations",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert resp.status_code == 200
    recs = resp.json()
    # item1 should NOT be recommended because buyer already bought it
    assert all(r["id"] != item1["id"] for r in recs)
    # Check that recommendation reasons exist
    assert any("recommendation_reason" in r for r in recs)

