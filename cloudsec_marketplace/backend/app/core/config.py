from typing import ClassVar
from pydantic_settings import BaseSettings, SettingsConfigDict
from app.core.secrets import load_config_values

_config = load_config_values()

class Settings(BaseSettings):
    MONGODB_URI: str = _config["MONGODB_URI"]
    DB_NAME: str = _config["DB_NAME"]
    STRIPE_SECRET_KEY: str | None = _config.get("STRIPE_SECRET_KEY")      # Stripe secret key for server-side API calls
    STRIPE_PUBLISHABLE_KEY: str | None = _config.get("STRIPE_PUBLISHABLE_KEY")   # Stripe publishable key exposed to frontend
    STRIPE_WEBHOOK_SECRET: str | None = _config.get("STRIPE_WEBHOOK_SECRET")    # Secret for verifying Stripe webhook signatures
    PLATFORM_FEE_PERCENT: float = 0.10         # Platform commission percentage (e.g. 10%)
    STRIPE_ONBOARD_REFRESH_URL: str = "http://localhost:3000/artist/onboard/refresh"
    STRIPE_ONBOARD_RETURN_URL: str = "http://localhost:3000/artist/onboard/complete"
    
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET_NAME: str = _config["AWS_S3_BUCKET_NAME"]
    SECRET_KEY: str = _config["SECRET_KEY"]# the key to hash with
    
    ALGORITHM: ClassVar[str] = "HS256" # Signing Algorithm we chose, HMAC + SHA-256
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 # How long our token is valid for

    model_config = SettingsConfigDict()

settings = Settings()