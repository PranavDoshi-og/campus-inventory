import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_database_overview_and_summary(client: AsyncClient, organizer_token: str):
    overview = await client.get("/reports/database", headers={"Authorization": f"Bearer {organizer_token}"})
    assert overview.status_code == 200
    data = overview.json()
    assert "tables" in data
    assert "users" in data["tables"]
    assert "preset_queries" in data

    summary = await client.get("/reports/summary", headers={"Authorization": f"Bearer {organizer_token}"})
    assert summary.status_code == 200
    sdata = summary.json()
    assert "total_revenue" in sdata
    assert "avg_order_value" in sdata


@pytest.mark.asyncio
async def test_sql_query_runner_and_security(client: AsyncClient, organizer_token: str):
    # Allowed SELECT query
    valid_query = await client.post(
        "/reports/query",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"query": "SELECT name, email, role FROM users LIMIT 5;"},
    )
    assert valid_query.status_code == 200
    res = valid_query.json()
    assert "columns" in res
    assert "rows" in res
    assert "execution_time_ms" in res

    # Forbidden DROP query
    drop_attempt = await client.post(
        "/reports/query",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"query": "DROP TABLE users;"},
    )
    assert drop_attempt.status_code == 400

    # Forbidden INSERT query
    insert_attempt = await client.post(
        "/reports/query",
        headers={"Authorization": f"Bearer {organizer_token}"},
        json={"query": "INSERT INTO users (id) VALUES ('x');"},
    )
    assert insert_attempt.status_code == 400


@pytest.mark.asyncio
async def test_csv_exports(client: AsyncClient, organizer_token: str):
    orders_csv = await client.get("/reports/export/orders.csv", headers={"Authorization": f"Bearer {organizer_token}"})
    assert orders_csv.status_code == 200
    assert "text/csv" in orders_csv.headers["content-type"]
    assert "Order ID" in orders_csv.text

    inventory_csv = await client.get("/reports/export/inventory.csv", headers={"Authorization": f"Bearer {organizer_token}"})
    assert inventory_csv.status_code == 200
    assert "text/csv" in inventory_csv.headers["content-type"]
    assert "SKU" in inventory_csv.text

