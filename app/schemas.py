from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)
    organizer_code: str | None = None  # valid code => organizer, otherwise buyer


class ItemCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=50)
    name: str
    kind: Literal["merch", "ticket"] = "merch"
    description: str = ""
    price: float = Field(ge=0)
    stock: int = Field(ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)
    per_user_limit: int | None = Field(default=None, ge=1)  # flash-sale cap
    sale_starts_at: datetime | None = None
    sale_ends_at: datetime | None = None
    event_date: datetime | None = None  # for tickets


class ItemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)
    per_user_limit: int | None = Field(default=None, ge=1)
    sale_starts_at: datetime | None = None
    sale_ends_at: datetime | None = None
    active: bool | None = None


class RestockIn(BaseModel):
    delta: int = Field(description="Positive to add stock, negative to write off")


class OrderIn(BaseModel):
    item_id: str
    quantity: int = Field(default=1, ge=1, le=20)


class TicketCheckInIn(BaseModel):
    ticket_code: str = Field(min_length=8, max_length=8, pattern=r"^[A-Fa-f0-9]{8}$")
