from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator


def new_id() -> str:
    return uuid4().hex


class UTCDateTime(TypeDecorator):
    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is not None and value.tzinfo is not None:
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('buyer', 'organizer')", name="ck_users_role"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False, default="buyer")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)

    items_created: Mapped[list["Item"]] = relationship(back_populates="creator")
    orders: Mapped[list["Order"]] = relationship(back_populates="buyer")


class Item(Base):
    __tablename__ = "items"
    __table_args__ = (
        CheckConstraint("kind IN ('merch', 'ticket')", name="ck_items_kind"),
        CheckConstraint("price >= 0", name="ck_items_price_nonnegative"),
        CheckConstraint("stock >= 0", name="ck_items_stock_nonnegative"),
        CheckConstraint("sold >= 0", name="ck_items_sold_nonnegative"),
        CheckConstraint("low_stock_threshold >= 0", name="ck_items_threshold_nonnegative"),
        CheckConstraint("per_user_limit IS NULL OR per_user_limit >= 1", name="ck_items_buyer_limit"),
        CheckConstraint(
            "sale_starts_at IS NULL OR sale_ends_at IS NULL OR sale_ends_at > sale_starts_at",
            name="ck_items_sale_window",
        ),
        Index("ix_items_active_name", "active", "name"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    sku: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default="merch")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False)
    sold: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    per_user_limit: Mapped[int | None] = mapped_column(Integer)
    sale_starts_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    sale_ends_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    event_date: Mapped[datetime | None] = mapped_column(UTCDateTime())
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)

    creator: Mapped[User] = relationship(back_populates="items_created")
    orders: Mapped[list["Order"]] = relationship(back_populates="item")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="item")
    purchase_counters: Mapped[list["PurchaseCounter"]] = relationship(back_populates="item")


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("quantity >= 1", name="ck_orders_quantity_positive"),
        CheckConstraint("unit_price >= 0 AND total >= 0", name="ck_orders_amounts_nonnegative"),
        CheckConstraint("status IN ('confirmed', 'cancelled')", name="ck_orders_status"),
        CheckConstraint("kind IN ('merch', 'ticket')", name="ck_orders_kind"),
        Index("ix_orders_buyer_created", "buyer_id", "created_at"),
        Index("ix_orders_item_status", "item_id", "status"),
        Index("ix_orders_status_sku", "status", "sku"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    buyer_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id", ondelete="RESTRICT"), nullable=False)
    sku: Mapped[str] = mapped_column(String(50), nullable=False)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="confirmed")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    cancelled_at: Mapped[datetime | None] = mapped_column(UTCDateTime())

    buyer: Mapped[User] = relationship(back_populates="orders")
    item: Mapped[Item] = relationship(back_populates="orders")
    tickets: Mapped[list["TicketCode"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class TicketCode(Base):
    __tablename__ = "ticket_codes"
    __table_args__ = (
        CheckConstraint("length(code) = 8", name="ck_ticket_codes_length"),
        Index("ix_ticket_codes_order", "order_id"),
    )

    code: Mapped[str] = mapped_column(String(8), primary_key=True)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    checked_in_at: Mapped[datetime | None] = mapped_column(UTCDateTime())

    order: Mapped[Order] = relationship(back_populates="tickets")


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (
        CheckConstraint("type IN ('low_stock', 'sold_out')", name="ck_alerts_type"),
        CheckConstraint("stock >= 0 AND threshold >= 0", name="ck_alerts_stock_nonnegative"),
        Index("ix_alerts_created", "created_at"),
        Index("ix_alerts_ack_created", "acknowledged", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id", ondelete="RESTRICT"), nullable=False)
    sku: Mapped[str] = mapped_column(String(50), nullable=False)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False)
    threshold: Mapped[int] = mapped_column(Integer, nullable=False)
    acknowledged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)

    item: Mapped[Item] = relationship(back_populates="alerts")


class PurchaseCounter(Base):
    __tablename__ = "purchase_counters"
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="ck_purchase_counters_nonnegative"),
        Index("ix_purchase_counters_buyer", "buyer_id"),
    )

    item_id: Mapped[str] = mapped_column(
        ForeignKey("items.id", ondelete="CASCADE"), primary_key=True
    )
    buyer_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    item: Mapped[Item] = relationship(back_populates="purchase_counters")
