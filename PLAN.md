# VietMAS Chatbot — MVP Plan

## 1. Mục tiêu

Xây dựng một chatbot có thể chạy trên điện thoại Android, kết nối với AI Gemini, để tiếp nhận và xử lý các yêu cầu kho đơn giản như nhập kho, xuất kho và kiểm tồn kho. Hệ thống đồng thời cung cấp admin dashboard web để quản lý người dùng, hội thoại, tồn kho và cấu hình chatbot.

## 2. Kiến trúc và công nghệ đã chốt

| Thành phần | Công nghệ |
|---|---|
| Ứng dụng Android | Flutter |
| Admin dashboard | React/Next.js |
| Backend/API | FastAPI Python |
| Cơ sở dữ liệu | PostgreSQL |
| AI | Gemini API |
| Model AI dự kiến | Gemini 3.1 Flash Lite |
| Đăng nhập | Tài khoản mặc định hardcode trong giai đoạn MVP |
| Thông báo đẩy | Firebase Cloud Messaging (FCM) |
| Lưu trữ file | Firebase Storage |
| Triển khai | Google Cloud |

## 3. Phạm vi chức năng MVP

### 3.1. Ứng dụng Android

- Giao diện chat.
- Gửi câu hỏi đến backend.
- Nhận và hiển thị phản hồi từ Gemini API.
- Hiển thị trạng thái đang xử lý khi chờ phản hồi AI.
- Lưu lịch sử hội thoại.
- Tiếp nhận yêu cầu nhập kho.
- Tiếp nhận yêu cầu xuất kho.
- Tiếp nhận yêu cầu kiểm tra tồn kho.
- Hiển thị tình trạng tồn kho sau khi xử lý yêu cầu.
- Từ chối hoặc yêu cầu bổ sung thông tin khi yêu cầu kho thiếu dữ liệu hoặc không hợp lệ.

### 3.2. Admin dashboard

- Đăng nhập và phân quyền theo vai trò.
- Xem danh sách người dùng.
- Xem lịch sử hội thoại.
- Xem bảng tồn kho.
- Thêm mới dữ liệu kho và các giao dịch nhập/xuất kho.
- Sửa và xóa dữ liệu kho theo quyền hạn.
- Quản lý prompt và cấu hình AI.
- Xem thống kê số người dùng.
- Xem thống kê số câu hỏi.
- Theo dõi chi phí API.

### 3.3. Nghiệp vụ kho

- Tồn kho được cập nhật dựa trên các giao dịch nhập kho và xuất kho.
- Không cho phép xuất số lượng lớn hơn số lượng tồn hiện tại.
- Mỗi giao dịch phải lưu người thực hiện, thời gian, loại giao dịch, sản phẩm và số lượng.
- Các thay đổi tồn kho phải được ghi lịch sử để có thể kiểm tra và đối soát.
- Chatbot chỉ xử lý các yêu cầu kho đơn giản; các yêu cầu thiếu thông tin hoặc vượt ngoài phạm vi phải được chuyển sang xử lý thủ công.
- Không cho phép xuất kho khi số lượng xuất lớn hơn số lượng tồn.
- Không cho phép điều chỉnh tồn kho thủ công đối với CEO và Manager.
- Admin là vai trò duy nhất được phép điều chỉnh tồn kho thủ công; thao tác này phải có lý do và được ghi audit log.

### 3.4. Mô hình kho cho doanh nghiệp sản xuất muối ớt

Hệ thống gồm hai nhóm kho chính:

- `raw_material`: kho nguyên liệu.
  - Muối.
  - Ớt.
  - Có thể mở rộng thêm đường, dầu, gia vị hoặc bao bì khi doanh nghiệp phát sinh nhu cầu.
- `finished_goods`: kho thành phẩm.
  - Các sản phẩm muối ớt đóng gói theo từng quy cách, ví dụ muối ớt hũ nhỏ, hũ lớn, túi hoặc thùng.

Thông tin sản phẩm đề xuất:

- Mã hàng/SKU.
- Tên hàng.
- Nhóm hàng: nguyên liệu hoặc thành phẩm.
- Đơn vị tính: kg, g, hũ, túi, thùng hoặc đơn vị phù hợp.
- Số lượng tồn hiện tại.
- Ngưỡng cảnh báo tồn kho thấp.
- Trạng thái hoạt động.
- Ghi chú.

Đối với thành phẩm, nên lưu thêm quy cách đóng gói và đơn vị quy đổi nếu cần, ví dụ `1 thùng = 24 hũ`. Giai đoạn MVP có thể quản lý theo một đơn vị tồn kho chính cho mỗi SKU để tránh nhầm lẫn khi xuất nhập.

## 4. Người dùng và phân quyền

Hệ thống MVP có ba vai trò:

| Vai trò | Quyền hạn |
|---|---|
| `admin` | Toàn quyền quản lý người dùng, hội thoại, tồn kho, giao dịch kho, prompt và cấu hình AI; được thêm, sửa và xóa dữ liệu. |
| `ceo` | Quản lý nghiệp vụ kho, hội thoại, prompt và cấu hình AI; được thêm, sửa và xóa dữ liệu kho nhưng không quản lý tài khoản hệ thống. Không được điều chỉnh tồn kho thủ công. |
| `manager` | Chỉ được thêm mới giao dịch/dữ liệu kho và xem tình trạng tồn kho; không được quản lý người dùng, prompt, cấu hình AI, sửa hoặc xóa dữ liệu. |

Ma trận quyền cơ bản:

| Chức năng | Admin | CEO | Manager |
|---|---:|---:|---:|
| Đăng nhập | Có | Có | Có |
| Xem người dùng | Có | Có | Không |
| Xem hội thoại | Có | Có | Không |
| Xem tồn kho | Có | Có | Có |
| Thêm dữ liệu/giao dịch kho | Có | Có | Có |
| Sửa dữ liệu/giao dịch kho | Có | Có | Không |
| Xóa dữ liệu/giao dịch kho | Có | Có | Không |
| Điều chỉnh tồn kho thủ công | Có | Không | Không |
| Quản lý prompt và cấu hình AI | Có | Có | Không |
| Xem thống kê và chi phí API | Có | Có | Không |

Quyền phải được kiểm tra ở backend FastAPI, không chỉ ẩn nút trên giao diện.

## 5. Luồng dữ liệu chính

```text
Flutter Android App
        |
        v
FastAPI Backend ----> PostgreSQL
        |
        +-----------> Gemini API
        |
        +-----------> Firebase Storage / FCM

Next.js Admin Dashboard
        |
        v
FastAPI Backend
```

## 6. API dự kiến

### Người dùng và đăng nhập

```text
POST /auth/login
GET  /users/me
```

### Chat và hội thoại

```text
POST /chat/message
GET  /conversations
GET  /conversations/{conversation_id}
```

### Kho và tồn kho

```text
GET  /inventory
GET  /inventory/{item_id}
POST /inventory/transactions
GET  /inventory/transactions
PUT  /inventory/{item_id}
DELETE /inventory/{item_id}
POST /inventory/adjustments
```

Các API `PUT` và `DELETE` phải kiểm tra vai trò; Manager không được phép sử dụng hai thao tác này. API `POST /inventory/adjustments` chỉ dành cho Admin.

### Admin

```text
POST /admin/login
GET  /admin/users
GET  /admin/conversations

GET  /admin/prompts
PUT  /admin/prompts/{prompt_id}
GET  /admin/ai-config
PUT  /admin/ai-config

GET  /admin/statistics
```

## 7. Database dự kiến

Các bảng chính:

- `users`: người dùng ứng dụng.
- `roles`: các vai trò `admin`, `ceo` và `manager`, hoặc trường `role` trong `users` ở phiên bản MVP.
- `conversations`: các phiên hội thoại.
- `messages`: tin nhắn của người dùng và phản hồi AI.
- `inventory_items`: danh mục sản phẩm và số lượng tồn hiện tại.
- `inventory_transactions`: lịch sử nhập kho, xuất kho và điều chỉnh tồn kho.
- `inventory_audit_logs`: lịch sử thao tác thêm, sửa, xóa và người thực hiện.
- `ai_configs`: model, temperature, giới hạn token và các cấu hình AI.
- `api_usage`: số lượt gọi, token sử dụng và chi phí ước tính.

Có thể dùng trường `category` hoặc bảng `warehouses` để phân biệt kho nguyên liệu và kho thành phẩm. Ở MVP, trường `category` với hai giá trị `raw_material` và `finished_goods` là đủ; khi có nhiều địa điểm kho mới cần tách thành bảng `warehouses`.

Thông tin tối thiểu của `inventory_items`:

- Mã sản phẩm.
- Tên sản phẩm.
- Đơn vị tính.
- Số lượng tồn hiện tại.
- Ngưỡng cảnh báo tồn kho thấp.
- Thời gian cập nhật gần nhất.

Thông tin tối thiểu của `inventory_transactions`:

- Sản phẩm.
- Loại giao dịch: `import`, `export` hoặc `adjustment`.
- Số lượng.
- Người thực hiện.
- Thời gian thực hiện.
- Ghi chú và mã tham chiếu nếu có.

Tất cả giao dịch phải lưu người thực hiện, thời gian và ghi chú. Giao dịch `adjustment` chỉ được tạo bởi Admin.

## 8. Ghi chú bảo mật

- Tài khoản hardcode chỉ dùng cho bản MVP nội bộ.
- Tài khoản mặc định MVP:
  - Admin: `admin` / `admin123`
  - CEO: `ceo` / `ceo123`
  - Manager: `manager` / `manager123`
- Các mật khẩu trên phải được đổi trước khi đưa hệ thống ra môi trường thực tế.
- Gemini API key chỉ được lưu ở Secret Manager trên Google Cloud.
- Tất cả API kho phải kiểm tra vai trò ở backend; không tin tưởng role do client tự gửi lên.
- Không cho phép Manager sửa hoặc xóa bằng cách gọi API trực tiếp.
- Các thao tác sửa, xóa và điều chỉnh tồn kho phải được ghi audit log.
- Cần giới hạn request và ghi log sử dụng AI để kiểm soát chi phí.

## 9. Thứ tự triển khai

1. Khởi tạo backend FastAPI và kết nối PostgreSQL trên Cloud SQL.
2. Tạo schema cho users, conversations, messages, inventory_items và inventory_transactions.
3. Xây dựng xác thực và kiểm tra quyền theo ba vai trò.
4. Xây dựng API nhập kho, xuất kho, kiểm tồn, điều chỉnh tồn kho dành riêng cho Admin và audit log.
5. Xây dựng API chat và tích hợp Gemini 3.1 Flash Lite.
6. Xây dựng giao diện chat Flutter.
7. Thêm lưu lịch sử hội thoại và hiển thị kết quả tồn kho.
8. Xây dựng admin dashboard Next.js.
9. Thêm quản lý prompt, cấu hình AI, tồn kho và thống kê.
10. Tích hợp Firebase Storage và Firebase Cloud Messaging.
11. Kiểm thử quyền hạn và luồng kho end-to-end.
12. Triển khai FastAPI và Next.js trên Cloud Run; triển khai PostgreSQL trên Cloud SQL và các dịch vụ liên quan trên Google Cloud.

## 10. Tiến độ thực thi

### Đã hoàn thành

- Dựng cấu trúc backend FastAPI, app Flutter và admin dashboard Next.js.
- Tạo schema người dùng, hội thoại, tin nhắn, sản phẩm và giao dịch kho.
- Seed dữ liệu ban đầu cho Muối và Ớt.
- Đăng nhập MVP cho ba vai trò.
- Phân quyền Admin, CEO và Manager ở backend.
- API nhập kho, xuất kho, kiểm tồn và điều chỉnh tồn kho dành riêng cho Admin.
- Chặn xuất vượt số lượng tồn.
- Chatbot nhận diện các lệnh tiếng Việt đơn giản về nhập, xuất và kiểm tồn.
- Tích hợp Gemini với fallback khi chưa cấu hình API key.
- Kiểm thử backend, build dashboard và kiểm tra Flutter analyzer.

### Đã hoàn thành bổ sung

- Hoàn thiện màn hình đăng nhập và chat có Bearer token trên Flutter.
- Hoàn thiện đăng nhập dashboard Next.js.
- Dashboard hiển thị tồn kho cho cả Admin, CEO và Manager.
- Dashboard hiển thị thống kê cho Admin và CEO theo đúng quyền backend.
- Dashboard có form thêm/sửa sản phẩm theo quyền.
- Dashboard có form nhập kho, xuất kho và điều chỉnh tồn kho riêng cho Admin.
- Dashboard hiển thị lịch sử giao dịch kho.
- Đóng gói local bằng Docker Compose gồm PostgreSQL, FastAPI backend và Next.js dashboard.
- Loại bỏ tên container cố định để tránh xung đột với các dự án Docker khác.

### Đang thực hiện

- CRUD giao diện đầy đủ cho sản phẩm và giao dịch kho trên dashboard.

Docker Compose đã kiểm tra cấu hình thành công; cần bật Docker Desktop để build và khởi động container thực tế.

### Chưa thực hiện

- CRUD giao diện đầy đủ cho sản phẩm và giao dịch kho trên dashboard.
- Quản lý prompt/cấu hình AI trên dashboard.
- FCM, Firebase Storage và upload file.
- Cloud SQL, Secret Manager và triển khai Cloud Run.
