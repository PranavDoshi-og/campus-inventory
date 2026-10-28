from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator


def _sale_window_is_valid(starts_at: datetime, ends_at: datetime) -> bool:
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=timezone.utc)
    if ends_at.tzinfo is None:
        ends_at = ends_at.replace(tzinfo=timezone.utc)
    return ends_at > starts_at


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

    @model_validator(mode="after")
    def validate_sale_window(self):
        if self.sale_starts_at and self.sale_ends_at and not _sale_window_is_valid(
            self.sale_starts_at, self.sale_ends_at
        ):
            raise ValueError("sale_ends_at must be after sale_starts_at")
        return self


class ItemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)
    per_user_limit: int | None = Field(default=None, ge=1)
    sale_starts_at: datetime | None = None
    sale_ends_at: datetime | None = None
    event_date: datetime | None = None
    active: bool | None = None

    @model_validator(mode="after")
    def validate_sale_window(self):
        if self.sale_starts_at and self.sale_ends_at and not _sale_window_is_valid(
            self.sale_starts_at, self.sale_ends_at
        ):
            raise ValueError("sale_ends_at must be after sale_starts_at")
        return self


class RestockIn(BaseModel):
    delta: int = Field(description="Positive to add stock, negative to write off")


class OrderIn(BaseModel):
    item_id: str
    quantity: int = Field(default=1, ge=1, le=20)


class TicketCheckInIn(BaseModel):
    ticket_code: str = Field(min_length=8, max_length=8, pattern=r"^[A-Fa-f0-9]{8}$")
