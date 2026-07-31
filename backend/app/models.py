from datetime import datetime, timezone
import json
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, Enum):
    ADMIN = "admin"
    CEO = "ceo"
    MANAGER = "manager"


class PartnerType(str, Enum):
    CUSTOMER = "customer"
    VENDOR = "vendor"
    SERVICE = "service"


class PartnerStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class CompanyProfile(Base):
    __tablename__ = "company_profile"

    id: Mapped[int] = mapped_column(primary_key=True)
    legal_name: Mapped[str] = mapped_column(String(255))
    short_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    tax_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    legal_representative: Mapped[str | None] = mapped_column(String(160), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class CompanyProfileHistory(Base):
    __tablename__ = "company_profile_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_profile_id: Mapped[int] = mapped_column(ForeignKey("company_profile.id"), index=True)
    changed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(20), default="updated")
    snapshot_json: Mapped[str] = mapped_column(Text)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    def snapshot(self) -> dict[str, str | None]:
        return json.loads(self.snapshot_json)


class InventoryCategory(str, Enum):
    RAW_MATERIAL = "raw_material"
    FINISHED_GOODS = "finished_goods"


class TransactionType(str, Enum):
    IMPORT = "import"
    EXPORT = "export"
    ADJUSTMENT = "adjustment"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[Role] = mapped_column(SAEnum(Role), index=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    transactions: Mapped[list["InventoryTransaction"]] = relationship(back_populates="created_by")


class Partner(Base):
    __tablename__ = "partners"

    id: Mapped[int] = mapped_column(primary_key=True)
    legal_name: Mapped[str] = mapped_column(String(255), index=True)
    short_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    partner_type: Mapped[PartnerType] = mapped_column(SAEnum(PartnerType), index=True)
    tax_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    legal_representative: Mapped[str | None] = mapped_column(String(160), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[PartnerStatus] = mapped_column(SAEnum(PartnerStatus), default=PartnerStatus.ACTIVE, index=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    created_by: Mapped[User] = relationship(foreign_keys=[created_by_id])
    supplies: Mapped[list["PartnerSupply"]] = relationship(back_populates="partner", cascade="all, delete-orphan")


class PartnerSupply(Base):
    __tablename__ = "partner_supplies"
    __table_args__ = (UniqueConstraint("partner_id", "inventory_item_id", name="uq_partner_supply"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    partner_id: Mapped[int] = mapped_column(ForeignKey("partners.id"), index=True)
    inventory_item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"), index=True)
    partner: Mapped[Partner] = relationship(back_populates="supplies")
    inventory_item: Mapped["InventoryItem"] = relationship()


class PartnerHistory(Base):
    __tablename__ = "partner_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    partner_id: Mapped[int] = mapped_column(ForeignKey("partners.id"), index=True)
    changed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(20), default="updated")
    snapshot_json: Mapped[str] = mapped_column(Text)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    def snapshot(self) -> dict:
        return json.loads(self.snapshot_json)


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[InventoryCategory] = mapped_column(SAEnum(InventoryCategory), index=True)
    unit: Mapped[str] = mapped_column(String(30))
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=0)
    packaging_note: Mapped[str | None] = mapped_column(String(160), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    transactions: Mapped[list["InventoryTransaction"]] = relationship(back_populates="item")


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"), index=True)
    transaction_type: Mapped[TransactionType] = mapped_column(SAEnum(TransactionType), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    note: Mapped[str] = mapped_column(Text, default="")
    reference_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    item: Mapped[InventoryItem] = relationship(back_populates="transactions")
    created_by: Mapped[User] = relationship(back_populates="transactions")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(160), default="Cuộc hội thoại mới")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"), index=True)
    sender: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
