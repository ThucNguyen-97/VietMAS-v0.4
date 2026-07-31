from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from .models import InventoryCategory, Role, TransactionType


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    display_name: str
    role: Role


class LoginResponse(BaseModel):
    access_token: str
    user: UserResponse


class CompanyProfileBase(BaseModel):
    legal_name: str = Field(min_length=1, max_length=255)
    short_name: str | None = Field(default=None, max_length=120)
    tax_code: str = Field(min_length=1, max_length=30)
    address: str | None = None
    phone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=160)
    legal_representative: str | None = Field(default=None, max_length=160)
    logo_url: str | None = Field(default=None, max_length=500)


class CompanyProfileResponse(CompanyProfileBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class CompanyProfileHistoryResponse(BaseModel):
    id: int
    action: str
    changed_by_id: int
    changed_at: datetime
    snapshot: CompanyProfileBase


class InventoryCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=160)
    category: InventoryCategory
    unit: str = Field(min_length=1, max_length=30)
    quantity: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=0, ge=0)
    packaging_note: str | None = None


class InventoryUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    low_stock_threshold: int | None = Field(default=None, ge=0)
    packaging_note: str | None = None
    is_active: bool | None = None


class InventoryResponse(InventoryCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TransactionCreate(BaseModel):
    item_id: int
    transaction_type: TransactionType
    quantity: int = Field(gt=0)
    note: str = Field(min_length=1)
    reference_code: str | None = None


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    item_id: int
    transaction_type: TransactionType
    quantity: int
    note: str
    reference_code: str | None
    created_by_id: int
    created_at: datetime


class ChatRequest(BaseModel):
    conversation_id: int | None = None
    message: str = Field(min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    conversation_id: int
    reply: str
