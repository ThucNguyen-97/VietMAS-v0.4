# VietMAS Backend

## Chạy local

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
py -m uvicorn app.main:app --reload --port 8000
```

Mặc định dùng SQLite local. Khi triển khai, đặt `DATABASE_URL` về PostgreSQL Cloud SQL và các secret qua Secret Manager.

Swagger: `http://localhost:8000/docs`
