from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    PROJECT_NAME: str = "AI Life OS Backend"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Security Settings
    SECRET_KEY: str = "placeholder-secret-key-to-be-replaced-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 11520

    # Firebase Settings
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    FIREBASE_CREDENTIALS_JSON: Optional[str] = None
    FIREBASE_DATABASE_URL: Optional[str] = None

    # CORS & Security Settings
    BACKEND_CORS_ORIGINS: list[str] = ["*"]
    RATE_LIMIT_PER_MINUTE: int = 120

settings = Settings()

