import re

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .gemini import generate_reply
from .models import InventoryItem, InventoryTransaction, TransactionType


NUMBER_PATTERN = r"(\d+(?:[.,]\d+)?)"


def _find_item(message: str, db: Session) -> InventoryItem | None:
    normalized = message.casefold()
    items = list(db.scalars(select(InventoryItem).where(InventoryItem.is_active.is_(True))).all())
    exact = [item for item in items if item.name.casefold() in normalized or item.sku.casefold() in normalized]
    if exact:
        return max(exact, key=lambda item: len(item.name))
    aliases = {"ớt": "Ớt", "ot": "Ớt", "muối": "Muối", "muoi": "Muối"}
    for alias, name in aliases.items():
        if alias in normalized:
            return next((item for item in items if item.name.casefold() == name.casefold()), None)
    return None


def _quantity(message: str) -> int | None:
    match = re.search(NUMBER_PATTERN, message)
    if not match:
        return None
    return int(float(match.group(1).replace(",", ".")))


def handle_inventory_message(message: str, user_id: int, db: Session) -> str | None:
    normalized = message.casefold()
    item = _find_item(message, db)
    is_stock_query = any(word in normalized for word in ("tồn", "ton", "còn", "con", "bao nhiêu", "kiểm tồn", "kiem ton"))
    is_import = any(word in normalized for word in ("nhập", "nhap"))
    is_export = any(word in normalized for word in ("xuất", "xuat"))

    if is_stock_query and not is_import and not is_export:
        if not item:
            return "Bạn muốn kiểm tồn sản phẩm nào? Ví dụ: ‘Kho còn bao nhiêu muối?’"
        warning = " (đang dưới ngưỡng cảnh báo)" if item.quantity <= item.low_stock_threshold else ""
        return f"{item.name} hiện còn {item.quantity} {item.unit}{warning}."

    if not is_import and not is_export:
        return None
    if not item:
        return "Bạn vui lòng cho biết sản phẩm cần nhập hoặc xuất, ví dụ: ‘Nhập 50 kg muối’."
    quantity = _quantity(message)
    if not quantity or quantity <= 0:
        return f"Bạn vui lòng cho biết số lượng {item.name} cần {'nhập' if is_import else 'xuất'}."

    transaction_type = TransactionType.IMPORT if is_import else TransactionType.EXPORT
    if transaction_type == TransactionType.EXPORT and quantity > item.quantity:
        return f"Không thể xuất {quantity} {item.unit} {item.name}; tồn kho hiện chỉ có {item.quantity} {item.unit}."
    if transaction_type == TransactionType.IMPORT:
        item.quantity += quantity
        action = "nhập"
    else:
        item.quantity -= quantity
        action = "xuất"
    transaction = InventoryTransaction(
        item_id=item.id,
        transaction_type=transaction_type,
        quantity=quantity,
        note=f"Tạo từ chatbot: {message}",
        created_by_id=user_id,
    )
    db.add(transaction)
    db.commit()
    return f"Đã {action} {quantity} {item.unit} {item.name}. Tồn kho hiện tại: {item.quantity} {item.unit}."


def chat_reply(message: str, user_id: int, db: Session) -> str:
    inventory_reply = handle_inventory_message(message, user_id, db)
    return inventory_reply if inventory_reply is not None else generate_reply(message)

