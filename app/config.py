"""Application settings, loaded from environment variables."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://autism_user:changeme@localhost:5432/autism_support"

    # Auth
    jwt_secret_key: str = "changeme-generate-a-long-random-value"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # AI provider. "groq" is api.groq.com (keys begin "gsk_"); not to be confused
    # with xAI's Grok, which is a different company.
    ai_provider: str = "mock"
    groq_api_key: str = ""
    google_api_key: str = ""
    ai_companion_model: str = "openai/gpt-oss-120b"
    ai_classifier_model: str = "openai/gpt-oss-120b"
    ai_classifier_timeout_seconds: float = 20.0

    # Safety / alerts
    safety_country: str = "AU"

    # Companion rate limiting (per child)
    companion_rate_limit_per_minute: int = 10
    companion_session_max_messages: int = 40
    companion_session_window_minutes: int = 60

    # Video
    video_provider: str = "mock"
    daily_api_key: str = ""

    # Reminders
    reminder_lead_minutes: int = 60

    # Child access. A child never has an email or password: a parent either pairs the
    # child's own phone with a short code, or hands their own phone over for a sitting.
    child_link_code_ttl_minutes: int = 15
    child_device_token_days: int = 90
    child_session_minutes: int = 120

    # Therapist verification: when false, self-registered therapists start "pending"
    # and stay out of the parent-facing directory until an admin approves them.
    therapist_auto_approve: bool = False

    # App
    environment: str = "development"
    cors_origins: str = "http://localhost:3000,http://localhost:8081,http://localhost:19006,*"


@lru_cache
def get_settings() -> Settings:
    return Settings()
