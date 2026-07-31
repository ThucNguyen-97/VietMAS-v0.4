# VietMAS v0.4 — MVP Plan

## Mục tiêu

Chatbot Android hỗ trợ các nghiệp vụ kho đơn giản cho doanh nghiệp sản xuất muối ớt: nhập kho, xuất kho và kiểm tồn. Hệ thống gồm app Flutter, dashboard quản trị và backend FastAPI.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Mobile | Flutter / Android |
| Dashboard | React / Next.js |
| Backend | FastAPI Python |
| Database | PostgreSQL; SQLite cho local |
| AI | Gemini API, dự kiến Gemini 3.1 Flash Lite |
| Hạ tầng | Docker Compose local; Cloud Run + Cloud SQL production |
| Dịch vụ dự kiến | Firebase FCM, Firebase Storage, Secret Manager |

## Chức năng MVP

### Mobile và chatbot

- Đăng nhập, chat và lưu lịch sử hội thoại.
- Nhập kho, xuất kho, kiểm tồn bằng câu tiếng Việt.
- Hiển thị trạng thái xử lý và tồn kho sau giao dịch.
- Hỏi lại khi thiếu sản phẩm/số lượng; không xuất vượt tồn.
- Câu hỏi ngoài nghiệp vụ kho chuyển sang Gemini hoặc fallback local.

Ví dụ: `Nhập 50 kg muối`, `Xuất 10 kg ớt`, `Kho còn bao nhiêu muối?`

### Dashboard

- Đăng nhập và phân quyền.
- Xem tồn kho, lịch sử giao dịch và thống kê.
- Thêm/sửa/xóa sản phẩm theo quyền.
- Ghi nhận nhập kho, xuất kho; điều chỉnh tồn chỉ dành cho Admin.
- Quản lý prompt/cấu hình AI và người dùng là phần tiếp theo.

## Mô hình kho

- `raw_material`: Muối, Ớt; có thể mở rộng gia vị và bao bì.
- `finished_goods`: các SKU muối ớt theo hũ, túi hoặc thùng.
- Sản phẩm gồm SKU, tên, nhóm, đơn vị, số lượng tồn, ngưỡng cảnh báo, quy cách và ghi chú.
- Giao dịch gồm sản phẩm, loại `import`/`export`/`adjustment`, số lượng, người thực hiện, thời gian và ghi chú.
- `adjustment` chỉ Admin được tạo; mọi giao dịch phải có audit log.

## Phân quyền

| Quyền | Admin | CEO | Manager |
|---|---:|---:|---:|
| Đăng nhập, xem tồn kho | Có | Có | Có |
| Thêm sản phẩm/giao dịch | Có | Có | Có |
| Sửa/xóa sản phẩm | Có | Có | Không |
| Điều chỉnh tồn thủ công | Có | Không | Không |
| Xem người dùng, hội thoại, thống kê | Có | Có | Không |
| Quản lý prompt/cấu hình AI | Có | Có | Không |

Quyền được kiểm tra tại backend, không chỉ ẩn nút giao diện. Tài khoản MVP: `admin/admin123`, `ceo/ceo123`, `manager/manager123`.

## API chính

```text
POST /auth/login              GET  /users/me
POST /chat/message
GET  /inventory                GET  /inventory/{item_id}
POST /inventory                PUT  /inventory/{item_id}
DELETE /inventory/{item_id}
POST /inventory/transactions   GET  /inventory/transactions
GET  /admin/users              GET  /admin/statistics
```

## Database chính

`users`, `conversations`, `messages`, `inventory_items`, `inventory_transactions`, `inventory_audit_logs`, `ai_configs`, `api_usage`.

## Trạng thái

Đã hoàn thành: backend, schema và phân quyền; chatbot nhập/xuất/kiểm tồn; dashboard CRUD và lịch sử giao dịch; Flutter Android login/chat; Docker Compose; test backend, Next.js build và Flutter analyzer.

Chưa hoàn thành: FCM, Firebase Storage, quản lý prompt/cấu hình AI trên UI, Cloud SQL/Secret Manager và triển khai Cloud Run production.

## Chạy local

```powershell
docker compose up --build
```

Dashboard: `http://localhost:3000` · API: `http://localhost:8000/docs`.

## Bảo mật

Không commit `.env`, API key hoặc database local. Mật khẩu hardcode chỉ dành cho MVP nội bộ; production cần Secret Manager, JWT/session bền vững và đổi toàn bộ mật khẩu mặc định.

