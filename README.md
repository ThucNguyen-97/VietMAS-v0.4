# VietMAS v0.4

MVP chatbot quản lý kho cho doanh nghiệp sản xuất muối ớt.

## Thành phần

- `backend/`: FastAPI, SQLAlchemy, PostgreSQL/SQLite local.
- `admin/`: Next.js dashboard.
- `mobile/`: Flutter Android app.
- `docker-compose.yml`: PostgreSQL + backend + dashboard.
- `PLAN.md`: kế hoạch và phạm vi sản phẩm.

## Chức năng hiện tại

- Đăng nhập ba vai trò: Admin, CEO, Manager.
- Chat tiếng Việt cho nhập kho, xuất kho và kiểm tồn.
- Chặn xuất vượt tồn; điều chỉnh thủ công chỉ dành cho Admin.
- Dashboard CRUD sản phẩm, giao dịch và lịch sử tồn kho.
- Gemini có fallback local khi chưa cấu hình API key.

Ví dụ: `Nhập 50 kg muối`, `Xuất 10 kg ớt`, `Kho còn bao nhiêu muối?`

## Chạy bằng Docker

```powershell
docker compose up --build
```

- Dashboard: http://localhost:3000
- API/Swagger: http://localhost:8000/docs
- PostgreSQL: localhost:5432

Dừng service:

```powershell
docker compose down
```

Để bật Gemini, tạo `.env` ở thư mục gốc với `GEMINI_API_KEY=...`. Không commit `.env` hoặc dữ liệu local. Production sẽ dùng Cloud Run, Cloud SQL và Secret Manager.

