import os
import sys
import tempfile
from uuid import uuid4
from pathlib import Path

os.environ["DATABASE_URL"] = f"sqlite:///{Path(tempfile.gettempdir()) / f'vietmas_test_{uuid4().hex}.db'}"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from app.main import app


def test_roles_and_inventory_rules():
    with TestClient(app) as client:
        assert client.get("/health").json() == {"status": "ok"}
        admin = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
        manager = client.post("/auth/login", json={"username": "manager", "password": "manager123"})
        assert admin.status_code == 200
        assert manager.status_code == 200
        admin_headers = {"Authorization": f"Bearer {admin.json()['access_token']}"}
        manager_headers = {"Authorization": f"Bearer {manager.json()['access_token']}"}

        profile = client.put(
            "/company-profile",
            headers=admin_headers,
            json={
                "legal_name": "Công ty VietMAS",
                "short_name": "VietMAS",
                "tax_code": "0123456789",
                "address": "Hà Nội",
            },
        )
        assert profile.status_code == 200
        assert client.get("/company-profile", headers=manager_headers).json()["tax_code"] == "0123456789"
        unchanged = client.put(
            "/company-profile",
            headers=admin_headers,
            json={
                "legal_name": "Công ty VietMAS",
                "short_name": "VietMAS",
                "tax_code": "0123456789",
                "address": "Hà Nội",
            },
        )
        assert unchanged.status_code == 200
        history = client.get("/company-profile/history", headers=admin_headers)
        assert history.status_code == 200
        assert len(history.json()) == 1

        items = client.get("/inventory", headers=admin_headers).json()
        assert len(items) == 2
        item_id = items[0]["id"]

        imported = client.post(
            "/inventory/transactions",
            headers=admin_headers,
            json={"item_id": item_id, "transaction_type": "import", "quantity": 10, "note": "Nhập thử"},
        )
        assert imported.status_code == 200
        assert client.put(f"/inventory/{item_id}", headers=manager_headers, json={"name": "Không được sửa"}).status_code == 403
        assert client.post(
            "/inventory/transactions",
            headers=manager_headers,
            json={"item_id": item_id, "transaction_type": "export", "quantity": 99999, "note": "Xuất thử"},
        ).status_code == 400
        assert client.post(
            "/inventory/transactions",
            headers=manager_headers,
            json={"item_id": item_id, "transaction_type": "adjustment", "quantity": 1, "note": "Điều chỉnh thử"},
        ).status_code == 403

        chat = client.post("/chat/message", headers=manager_headers, json={"message": "Nhập 50 kg muối"})
        assert chat.status_code == 200
        assert "Đã nhập 50 kg Muối" in chat.json()["reply"]
        stock = client.post("/chat/message", headers=manager_headers, json={"message": "Kho còn bao nhiêu muối?"})
        assert stock.status_code == 200
        assert "60 kg" in stock.json()["reply"]
