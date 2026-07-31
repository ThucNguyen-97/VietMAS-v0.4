from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./vietmas.db"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-flash-lite"
    app_secret: str = "change-this-secret"
    admin_username: str = "admin"
    admin_password: str = "admin123"
    ceo_username: str = "ceo"
    ceo_password: str = "ceo123"
    manager_username: str = "manager"
    manager_password: str = "manager123"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

