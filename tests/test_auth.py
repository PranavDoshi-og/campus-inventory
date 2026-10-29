import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login_buyer(client: AsyncClient):
    email = "new-student@campus.edu"
    password = "SuperPassword123!"
    reg = await client.post(
        "/auth/register",
        json={"name": "Alex Mercer", "email": email, "password": password},
    )
    assert reg.status_code == 201
    data = reg.json()
    assert data["email"] == email
    assert data["role"] == "buyer"

    login = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    assert token

    me = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["role"] == "buyer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    email = "dup-student@campus.edu"
    password = "Password123!"
    await client.post(
        "/auth/register",
        json={"name": "First Student", "email": email, "password": password},
    )
    dup = await client.post(
        "/auth/register",
        json={"name": "Second Student", "email": email, "password": password},
    )
    assert dup.status_code == 409
    assert "already registered" in dup.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    email = "wrong-pass@campus.edu"
    await client.post(
        "/auth/register",
        json={"name": "Sam", "email": email, "password": "CorrectPassword123!"},
    )
    login = await client.post(
        "/auth/login",
        data={"username": email, "password": "WrongPassword!"},
    )
    assert login.status_code == 401

