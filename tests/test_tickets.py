import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_ticket_generation_and_checkin(client: AsyncClient, organizer_token: str, buyer_token: str):
    ticket_item = (await client.post(
        "/items",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={
            "sku": "EVENT-GALA-01",
            "name": "Spring Campus Gala",
            "kind": "ticket",
            "price": 15.0,
            "stock": 100,
        },
    )).json()

    order = (await client.post(
        "/orders",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"item_id": ticket_item["id"], "quantity": 2},
    )).json()

    assert len(order["ticket_codes"]) == 2
    code1 = order["ticket_codes"][0]

    # Organizer checks in ticket
    checkin_resp = await client.post(
        "/orders/check-in",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"ticket_code": code1},
    )
    assert checkin_resp.status_code == 200
    assert checkin_resp.json()["checked_in"] is True

    # Duplicate check in fails
    dup_resp = await client.post(
        "/orders/check-in",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"ticket_code": code1},
    )
    assert dup_resp.status_code == 409
    assert "already been checked in" in dup_resp.json()["detail"].lower()

    # Order cannot be cancelled once a ticket is checked in
    cancel_resp = await client.post(
        f"/orders/{order['id']}/cancel",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert cancel_resp.status_code == 404

