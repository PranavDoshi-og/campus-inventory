import os


class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./campus_inventory.db")
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
    JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "120"))
    ORGANIZER_INVITE_CODE = os.getenv("ORGANIZER_INVITE_CODE", "committee-2026")


settings = Settings()
