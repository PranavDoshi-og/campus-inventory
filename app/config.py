import os


class Settings:
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    MONGO_DB = os.getenv("MONGO_DB", "campus_inventory")
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
    JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "120"))
    ORGANIZER_INVITE_CODE = os.getenv("ORGANIZER_INVITE_CODE", "committee-2026")


settings = Settings()
