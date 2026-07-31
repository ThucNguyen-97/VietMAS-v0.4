# VietMAS v0.4

MVP chatbot quản lý kho cho doanh nghiệp sản xuất muối ớt.

## Cấu trúc

- `backend/`: FastAPI, SQLAlchemy, PostgreSQL/SQLite local.
- `admin/`: Next.js admin dashboard khung ban đầu.
- `mobile/`: Flutter Android app khung chat ban đầu.
- `PLAN.md`: đặc tả và quyết định sản phẩm.

## Trạng thái hiện tại

Backend đã có đăng nhập MVP, ba vai trò, dữ liệu mẫu Muối/Ớt, CRUD sản phẩm theo quyền, giao dịch nhập/xuất, chặn xuất vượt tồn và chatbot hiểu các lệnh đơn giản như nhập kho, xuất kho và kiểm tồn bằng tiếng Việt. Khi có `GEMINI_API_KEY`, các câu hỏi ngoài nghiệp vụ kho sẽ được gửi tới Gemini; nếu chưa có key, hệ thống vẫn chạy bằng fallback local.

Ví dụ chatbot:

- `Nhập 50 kg muối`
- `Xuất 10 kg ớt`
- `Kho còn bao nhiêu muối?`

Các chức năng FCM, Firebase Storage, màn hình đăng nhập hoàn chỉnh và triển khai Cloud Run vẫn để ở giai đoạn tích hợp sau.

## Chạy bằng Docker

Cài Docker Desktop, sau đó chạy tại thư mục gốc:

```powershell
docker compose up --build
```

Truy cập:

- Dashboard: `http://localhost:3000`
- API/Swagger: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

Tắt các service:

```powershell
docker compose down
```

Xóa cả dữ liệu PostgreSQL local:

```powershell
docker compose down -v
```

Để bật Gemini, tạo file `.env` ở thư mục gốc với `GEMINI_API_KEY=...` trước khi chạy Compose. Các mật khẩu trong Compose chỉ dành cho môi trường local.
