import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_users_crud(client: AsyncClient, organizer_token: str):
    # 1. Create User via POST /users
    create_resp = await client.post(
        "/users",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={
            "name": "Jordan Lee",
            "email": "jordan.lee@campus.edu",
            "password": "Password123!",
            "role": "buyer",
        },
    )
    assert create_resp.status_code == 201
    user = create_resp.json()
    assert user["name"] == "Jordan Lee"
    assert user["role"] == "buyer"
    user_id = user["id"]

    # 2. Read User via GET /users/{id}
    get_resp = await client.get(
        f"/users/{user_id}",
        headers={"Authorization": f"Bearer {organizer_token}"},
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["email"] == "jordan.lee@campus.edu"

    # 3. List Users via GET /users
    list_resp = await client.get(
        "/users",
        params={"search": "Jordan"},
        headers={"Authorization": f"Bearer {organizer_token}"},
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # 4. Update User via PATCH /users/{id}
    update_resp = await client.patch(
        f"/users/{user_id}",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"name": "Jordan Lee Jr.", "role": "organizer"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "Jordan Lee Jr."
    assert update_resp.json()["role"] == "organizer"

    # 5. Delete User via DELETE /users/{id}
    del_resp = await client.delete(
        f"/users/{user_id}",
        headers={"Authorization": f"Bearer {organizer_token}"},
    )
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True


@pytest.mark.asyncio
async def test_profile_update(client: AsyncClient, buyer_token: str):
    update_resp = await client.patch(
        "/auth/profile",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"name": "Updated Buyer Name"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "Updated Buyer Name"


@pytest.mark.asyncio
async def test_orders_crud(client: AsyncClient, organizer_token: str, buyer_token: str):
    # Setup item
    item = (await client.post(
        "/items",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"sku": "CRUD-ORDER-ITEM", "name": "CRUD Item", "price": 12.50, "stock": 10},
    )).json()

    # Create Order
    order = (await client.post(
        "/orders",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"item_id": item["id"], "quantity": 1},
    )).json()
    order_id = order["id"]

    # Read Order by ID via GET /orders/{id}
    read_resp = await client.get(
        f"/orders/{order_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert read_resp.status_code == 200
    assert read_resp.json()["id"] == order_id

    # Update Order status via PATCH /orders/{id}
    cancel_resp = await client.patch(
        f"/orders/{order_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"status": "cancelled"},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

    # Delete Order via DELETE /orders/{id}
    del_resp = await client.delete(
        f"/orders/{order_id}",
        headers={"Authorization": f"Bearer {organizer_token}"},
    )
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True


@pytest.mark.asyncio
async def test_alerts_crud(client: AsyncClient, organizer_token: str):
    item = (await client.post(
        "/items",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"sku": "CRUD-ALERT-ITEM", "name": "Alert Item", "price": 5.0, "stock": 2},
    )).json()

    # Create Alert
    create_resp = await client.post(
        "/alerts",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"item_id": item["id"], "type": "low_stock", "stock": 2, "threshold": 5},
    )
    assert create_resp.status_code == 201
    alert = create_resp.json()
    alert_id = alert["id"]

    # Read Alert
    read_resp = await client.get(
        f"/alerts/{alert_id}",
        headers={"Authorization": f"Bearer {organizer_token}"},
    )
    assert read_resp.status_code == 200
    assert read_resp.json()["id"] == alert_id

    # Update Alert
    patch_resp = await client.patch(
        f"/alerts/{alert_id}",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"acknowledged": True},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["acknowledged"] is True

    # Delete Alert
    del_resp = await client.delete(
        f"/alerts/{alert_id}",
        headers={"Authorization": f"Bearer {organizer_token}"},
    )
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True
