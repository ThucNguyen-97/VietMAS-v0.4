from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import current_user, login, require_roles, seed_users
from .database import Base, SessionLocal, engine, get_db
from .inventory_chat import chat_reply
import json

from .models import (
    CompanyProfile,
    CompanyProfileHistory,
    Conversation,
    InventoryCategory,
    InventoryItem,
    InventoryTransaction,
    Message,
    Partner,
    PartnerSupply,
    PartnerHistory,
    PartnerStatus,
    PartnerType,
    Role,
    TransactionType,
    User,
)
from .schemas import (
    ChatRequest,
    ChatResponse,
    CompanyProfileBase,
    CompanyProfileHistoryResponse,
    CompanyProfileResponse,
    InventoryCreate,
    InventoryResponse,
    InventoryUpdate,
    LoginRequest,
    LoginResponse,
    TransactionCreate,
    TransactionResponse,
    UserResponse,
    PartnerBase,
    PartnerResponse,
    PartnerHistoryResponse,
)

app = FastAPI(title="VietMAS Inventory Chatbot API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_users(db)
        if not db.scalar(select(InventoryItem).where(InventoryItem.sku == "RM-SALT")):
            db.add_all([
                InventoryItem(sku="RM-SALT", name="Muối", category=InventoryCategory.RAW_MATERIAL, unit="kg", low_stock_threshold=50),
                InventoryItem(sku="RM-CHILI", name="Ớt", category=InventoryCategory.RAW_MATERIAL, unit="kg", low_stock_threshold=20),
            ])
            db.commit()
        if not db.scalar(select(CompanyProfile).limit(1)):
            profile = CompanyProfile(
                legal_name="Công ty TNHH VietMAS Demo",
                short_name="VietMAS",
                tax_code="0100000000",
                address="123 Đường Sản Xuất, Quận Cầu Giấy, Hà Nội",
                phone="024 7300 2026",
                email="contact@vietmas.local",
                legal_representative="Nguyễn Minh An",
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
            admin = db.scalar(select(User).where(User.role == Role.ADMIN).order_by(User.id).limit(1))
            if admin:
                db.add(CompanyProfileHistory(
                    company_profile_id=profile.id,
                    changed_by_id=admin.id,
                    action="created",
                    snapshot_json=json.dumps({
                        "legal_name": profile.legal_name,
                        "short_name": profile.short_name,
                        "tax_code": profile.tax_code,
                        "address": profile.address,
                        "phone": profile.phone,
                        "email": profile.email,
                        "legal_representative": profile.legal_representative,
                        "logo_url": profile.logo_url,
                    }, ensure_ascii=False),
                ))
                db.commit()
        seed_partners(db)
        for partner in db.scalars(select(Partner).where(Partner.partner_type != PartnerType.VENDOR)).all():
            if partner.supplies:
                partner.supplies.clear()
        db.commit()
        if not db.scalar(select(PartnerHistory).limit(1)):
            admin = db.scalar(select(User).where(User.role == Role.ADMIN).order_by(User.id).limit(1))
            if admin:
                for partner in db.scalars(select(Partner)).all():
                    add_partner_history(db, partner, admin.id, "created")
                db.commit()


def seed_partners(db: Session) -> None:
    if db.scalar(select(Partner).limit(1)):
        return
    admin = db.scalar(select(User).where(User.role == Role.ADMIN).order_by(User.id).limit(1))
    if not admin:
        return
    items = {item.sku: item for item in db.scalars(select(InventoryItem)).all()}
    samples = [
        ("Công ty TNHH Nhà hàng Biển Xanh", "Biển Xanh", PartnerType.CUSTOMER, "0311000001", "Trần Hải Nam", "TP. Hồ Chí Minh", "0901000001", "contact@bienxanh.vn", []),
        ("Công ty CP Thực phẩm An Việt", "An Việt", PartnerType.CUSTOMER, "0101000002", "Lê Thu Hà", "Hà Nội", "0901000002", "hello@anviet.vn", []),
        ("Công ty TNHH Muối Ninh Thuận", "Muối Ninh Thuận", PartnerType.VENDOR, "4501000003", "Nguyễn Văn Sơn", "Ninh Thuận", "0901000003", "sales@muoininhthuan.vn", ["RM-SALT"]),
        ("Công ty TNHH Ớt Việt", "Ớt Việt", PartnerType.VENDOR, "3701000004", "Phạm Minh Đức", "Bình Dương", "0901000004", "sales@otviet.vn", ["RM-CHILI"]),
        ("Công ty CP Nông sản Việt Tâm", "Việt Tâm", PartnerType.VENDOR, "0101000005", "Đỗ Ngọc Lan", "Hà Nội", "0901000005", "sales@viettam.vn", ["RM-SALT", "RM-CHILI"]),
        ("Công ty TNHH VietMAS", "VietMAS", PartnerType.SERVICE, "0100000000", "Nguyễn Minh An", "Hà Nội", "024 7300 2026", "contact@vietmas.local", []),
    ]
    for legal_name, short_name, kind, tax_code, representative, address, phone, email, supply_skus in samples:
        partner = Partner(legal_name=legal_name, short_name=short_name, partner_type=kind, tax_code=tax_code,
                          legal_representative=representative, address=address, phone=phone, email=email,
                          status=PartnerStatus.ACTIVE, created_by_id=admin.id)
        db.add(partner)
        db.flush()
        for sku in supply_skus:
            if sku in items:
                db.add(PartnerSupply(partner_id=partner.id, inventory_item_id=items[sku].id))
        db.flush()
        add_partner_history(db, partner, admin.id, "created")
    db.commit()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/login", response_model=LoginResponse)
def auth_login(payload: LoginRequest, db: Session = Depends(get_db)):
    result = login(db, payload.username, payload.password)
    if not result:
        raise HTTPException(status_code=401, detail="Sai tài khoản hoặc mật khẩu")
    token, user = result
    return {"access_token": token, "user": user}


@app.get("/users/me", response_model=UserResponse)
def me(user=Depends(current_user), db: Session = Depends(get_db)):
    return db.get(User, user.user_id)


@app.get("/company-profile", response_model=CompanyProfileResponse)
def get_company_profile(db: Session = Depends(get_db), _: object = Depends(current_user)):
    profile = db.scalar(select(CompanyProfile).order_by(CompanyProfile.id).limit(1))
    if not profile:
        raise HTTPException(404, "Chưa cấu hình thông tin công ty")
    return profile


@app.get("/company-profile/history", response_model=list[CompanyProfileHistoryResponse])
def get_company_profile_history(db: Session = Depends(get_db), _: object = Depends(require_roles(Role.ADMIN, Role.CEO))):
    history = list(db.scalars(select(CompanyProfileHistory).order_by(CompanyProfileHistory.changed_at.desc())).all())
    return [
        {
            "id": entry.id,
            "action": entry.action,
            "changed_by_id": entry.changed_by_id,
            "changed_at": entry.changed_at,
            "snapshot": entry.snapshot(),
        }
        for entry in history
    ]


@app.put("/company-profile", response_model=CompanyProfileResponse)
def upsert_company_profile(
    payload: CompanyProfileBase,
    db: Session = Depends(get_db),
    user=Depends(require_roles(Role.ADMIN, Role.CEO)),
):
    profile = db.scalar(select(CompanyProfile).order_by(CompanyProfile.id).limit(1))
    is_new = profile is None
    values = payload.model_dump(exclude={"id", "created_at", "updated_at"})
    if profile and all(getattr(profile, key) == value for key, value in values.items()):
        return profile
    if profile:
        for key, value in values.items():
            setattr(profile, key, value)
    else:
        profile = CompanyProfile(**values)
        db.add(profile)
    db.commit()
    db.refresh(profile)
    db.add(CompanyProfileHistory(
        company_profile_id=profile.id,
        changed_by_id=user.user_id,
        action="created" if is_new else "updated",
        snapshot_json=json.dumps(values, ensure_ascii=False),
    ))
    db.commit()
    return profile


@app.get("/inventory", response_model=list[InventoryResponse])
def list_inventory(
    category: InventoryCategory | None = Query(default=None),
    db: Session = Depends(get_db),
    _: object = Depends(current_user),
):
    stmt = select(InventoryItem).where(InventoryItem.is_active.is_(True)).order_by(InventoryItem.category, InventoryItem.name)
    if category:
        stmt = stmt.where(InventoryItem.category == category)
    return list(db.scalars(stmt).all())


@app.post("/inventory", response_model=InventoryResponse)
def create_inventory(
    payload: InventoryCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(Role.ADMIN, Role.CEO, Role.MANAGER)),
):
    if db.scalar(select(InventoryItem).where(InventoryItem.sku == payload.sku)):
        raise HTTPException(409, "SKU đã tồn tại")
    item = InventoryItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/inventory/{item_id}", response_model=InventoryResponse)
def update_inventory(
    item_id: int,
    payload: InventoryUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(Role.ADMIN, Role.CEO)),
):
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(404, "Không tìm thấy sản phẩm")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/inventory/{item_id}")
def delete_inventory(item_id: int, db: Session = Depends(get_db), _: object = Depends(require_roles(Role.ADMIN, Role.CEO))):
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(404, "Không tìm thấy sản phẩm")
    item.is_active = False
    db.commit()
    return {"status": "deleted"}


@app.post("/inventory/transactions", response_model=TransactionResponse)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    user=Depends(require_roles(Role.ADMIN, Role.CEO, Role.MANAGER)),
):
    item = db.get(InventoryItem, payload.item_id)
    if not item or not item.is_active:
        raise HTTPException(404, "Không tìm thấy sản phẩm")
    if payload.transaction_type == TransactionType.ADJUSTMENT and user.role != Role.ADMIN:
        raise HTTPException(403, "Chỉ Admin được điều chỉnh tồn kho")
    if payload.transaction_type == TransactionType.EXPORT and payload.quantity > item.quantity:
        raise HTTPException(400, "Không thể xuất vượt số lượng tồn kho")
    if payload.transaction_type == TransactionType.IMPORT:
        item.quantity += payload.quantity
    elif payload.transaction_type == TransactionType.EXPORT:
        item.quantity -= payload.quantity
    else:
        item.quantity = payload.quantity
    transaction = InventoryTransaction(**payload.model_dump(), created_by_id=user.user_id)
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@app.get("/inventory/transactions", response_model=list[TransactionResponse])
def list_transactions(db: Session = Depends(get_db), _: object = Depends(current_user)):
    return list(db.scalars(select(InventoryTransaction).order_by(InventoryTransaction.created_at.desc())).all())


@app.get("/inventory/{item_id}", response_model=InventoryResponse)
def get_inventory(item_id: int, db: Session = Depends(get_db), _: object = Depends(current_user)):
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(404, "Không tìm thấy sản phẩm")
    return item


def partner_response(partner: Partner) -> dict:
    return {**{key: getattr(partner, key) for key in (
        "id", "legal_name", "short_name", "partner_type", "tax_code", "legal_representative", "address",
        "phone", "email", "logo_url", "status", "created_by_id", "created_at", "updated_at")},
        "supply_item_ids": [s.inventory_item_id for s in partner.supplies]}


def partner_snapshot(partner: Partner) -> dict:
    data = partner_response(partner)
    return data


def add_partner_history(db: Session, partner: Partner, user_id: int, action: str) -> None:
    db.add(PartnerHistory(
        partner_id=partner.id,
        changed_by_id=user_id,
        action=action,
        snapshot_json=json.dumps(partner_snapshot(partner), default=str, ensure_ascii=False),
    ))


@app.get("/partners", response_model=list[PartnerResponse])
def list_partners(db: Session = Depends(get_db), _: object = Depends(current_user)):
    return [partner_response(p) for p in db.scalars(select(Partner).order_by(Partner.partner_type, Partner.legal_name)).all()]


@app.get("/partners/history", response_model=list[PartnerHistoryResponse])
def list_partner_history(db: Session = Depends(get_db), _: object = Depends(require_roles(Role.ADMIN, Role.CEO))):
    history = list(db.scalars(select(PartnerHistory).order_by(PartnerHistory.changed_at.desc())).all())
    return [{"id": h.id, "action": h.action, "changed_by_id": h.changed_by_id, "changed_at": h.changed_at, "snapshot": h.snapshot()} for h in history]


@app.delete("/partners/history")
def clear_partner_history(db: Session = Depends(get_db), _: object = Depends(require_roles(Role.ADMIN, Role.CEO))):
    deleted = db.query(PartnerHistory).delete()
    db.commit()
    return {"status": "deleted", "deleted_count": deleted}


@app.get("/partners/{partner_id}", response_model=PartnerResponse)
def get_partner(partner_id: int, db: Session = Depends(get_db), _: object = Depends(current_user)):
    partner = db.get(Partner, partner_id)
    if not partner:
        raise HTTPException(404, "Không tìm thấy đối tác")
    return partner_response(partner)


@app.post("/partners", response_model=PartnerResponse)
def create_partner(payload: PartnerBase, db: Session = Depends(get_db), user=Depends(require_roles(Role.ADMIN, Role.CEO))):
    if db.scalar(select(Partner).where(Partner.tax_code == payload.tax_code)):
        raise HTTPException(409, "Mã số thuế đối tác đã tồn tại")
    if payload.partner_type != PartnerType.VENDOR and payload.supply_item_ids:
        raise HTTPException(400, "Chỉ vendor được khai báo vật tư cung cấp")
    partner = Partner(**payload.model_dump(exclude={"supply_item_ids"}), created_by_id=user.user_id)
    db.add(partner)
    db.flush()
    for item_id in set(payload.supply_item_ids):
        item = db.get(InventoryItem, item_id)
        if not item or not item.is_active:
            raise HTTPException(400, "Vật tư cung cấp không tồn tại hoặc đã ngừng sử dụng")
        db.add(PartnerSupply(partner_id=partner.id, inventory_item_id=item_id))
    db.commit()
    db.refresh(partner)
    add_partner_history(db, partner, user.user_id, "created")
    db.commit()
    return partner_response(partner)


@app.put("/partners/{partner_id}", response_model=PartnerResponse)
def update_partner(partner_id: int, payload: PartnerBase, db: Session = Depends(get_db), user=Depends(require_roles(Role.ADMIN, Role.CEO))):
    partner = db.get(Partner, partner_id)
    if not partner:
        raise HTTPException(404, "Không tìm thấy đối tác")
    duplicate = db.scalar(select(Partner).where(Partner.tax_code == payload.tax_code, Partner.id != partner_id))
    if duplicate:
        raise HTTPException(409, "Mã số thuế đối tác đã tồn tại")
    if payload.partner_type != PartnerType.VENDOR and payload.supply_item_ids:
        raise HTTPException(400, "Chỉ vendor được khai báo vật tư cung cấp")
    for key, value in payload.model_dump(exclude={"supply_item_ids"}).items():
        setattr(partner, key, value)
    db.query(PartnerSupply).filter(PartnerSupply.partner_id == partner_id).delete(synchronize_session=False)
    db.flush()
    for item_id in set(payload.supply_item_ids):
        item = db.get(InventoryItem, item_id)
        if not item or not item.is_active:
            raise HTTPException(400, "Vật tư cung cấp không tồn tại hoặc đã ngừng sử dụng")
        db.add(PartnerSupply(partner_id=partner_id, inventory_item_id=item_id))
    db.commit()
    db.refresh(partner)
    add_partner_history(db, partner, user.user_id, "updated")
    db.commit()
    return partner_response(partner)


@app.delete("/partners/{partner_id}")
def delete_partner(partner_id: int, db: Session = Depends(get_db), user=Depends(require_roles(Role.ADMIN, Role.CEO))):
    partner = db.get(Partner, partner_id)
    if not partner:
        raise HTTPException(404, "Không tìm thấy đối tác")
    partner.status = PartnerStatus.INACTIVE
    db.commit()
    add_partner_history(db, partner, user.user_id, "deleted")
    db.commit()
    return {"status": "deleted"}


@app.post("/chat/message", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db), user=Depends(current_user)):
    conversation = db.get(Conversation, payload.conversation_id) if payload.conversation_id else None
    if conversation and conversation.user_id != user.user_id:
        raise HTTPException(403, "Không có quyền truy cập cuộc hội thoại này")
    if not conversation:
        conversation = Conversation(user_id=user.user_id, title=payload.message[:80])
        db.add(conversation)
        db.flush()
    db.add(Message(conversation_id=conversation.id, sender="user", content=payload.message))
    reply = chat_reply(payload.message, user.user_id, db)
    db.add(Message(conversation_id=conversation.id, sender="assistant", content=reply))
    db.commit()
    return ChatResponse(conversation_id=conversation.id, reply=reply)


@app.get("/admin/users", response_model=list[UserResponse])
def admin_users(db: Session = Depends(get_db), _: object = Depends(require_roles(Role.ADMIN, Role.CEO))):
    return list(db.scalars(select(User).order_by(User.username)).all())
