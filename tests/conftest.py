import os
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Set temp database URL before importing app
temp_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
temp_db_file.close()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{temp_db_file.name}"
os.environ["ORGANIZER_INVITE_CODE"] = "test-secret-org-code"
os.environ["JWT_SECRET"] = "test-super-secret-key-12345-minimum-32-chars-long!"

from app import database
from app.main import app


@pytest_asyncio.fixture(scope="session", autouse=True)
async def init_test_db():
    await database.connect()
    yield
    await database.disconnect()
    try:
        os.remove(temp_db_file.name)
    except OSError:
        pass


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def organizer_token(client: AsyncClient):
    email = "test-organizer@campus.edu"
    password = "Password123!"
    reg_resp = await client.post(
        "/auth/register",
        json={
            "name": "Org Admin",
            "email": email,
            "password": password,
            "organizer_code": "test-secret-org-code",
        },
    )
    login_resp = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    return login_resp.json()["access_token"]


@pytest_asyncio.fixture
async def buyer_token(client: AsyncClient):
    email = "test-buyer@campus.edu"
    password = "Password123!"
    reg_resp = await client.post(
        "/auth/register",
        json={
            "name": "Student Buyer",
            "email": email,
            "password": password,
        },
    )
    login_resp = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    return login_resp.json()["access_token"]
