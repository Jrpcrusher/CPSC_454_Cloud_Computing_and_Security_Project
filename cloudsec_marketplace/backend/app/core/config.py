from typing import ClassVar
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MONGODB_URI: str
    DB_NAME: str
    STRIPE_SECRET_KEY: str | None = None       # Stripe secret key for server-side API calls
    STRIPE_PUBLISHABLE_KEY: str | None = None   # Stripe publishable key exposed to frontend
    STRIPE_WEBHOOK_SECRET: str | None = None    # Secret for verifying Stripe webhook signatures
    PLATFORM_FEE_PERCENT: float = 0.10         # Platform commission percentage (e.g. 10%)
    STRIPE_ONBOARD_REFRESH_URL: str = "http://localhost:3000/artist/onboard/refresh"
    STRIPE_ONBOARD_RETURN_URL: str = "http://localhost:3000/artist/onboard/complete"
    AWS_REGION: str | None = None               # We have the AWS region, or not
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET_NAME: str
    SECRET_KEY: str # the key to hash with
    
    ALGORITHM: ClassVar[str] = "HS256" # Signing Algorithm we chose, HMAC + SHA-256
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 # How long our token is valid for

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()