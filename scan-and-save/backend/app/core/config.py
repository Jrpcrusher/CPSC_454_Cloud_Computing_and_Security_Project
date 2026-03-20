from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URI: str
    DB_NAME: str
    STRIPE_SECRET_KEY: str | None = None       # Stripe secret key for server-side API calls
    STRIPE_PUBLISHABLE_KEY: str | None = None   # Stripe publishable key exposed to frontend
    STRIPE_WEBHOOK_SECRET: str | None = None    # Secret for verifying Stripe webhook signatures
    PLATFORM_FEE_PERCENT: float = 0.10         # Platform commission percentage (e.g. 10%)
    AWS_REGION: str | None = None               # We have the AWS region, or not
    SECRET_KEY: str # the key to hash with
    ALGORITHM = "HS256" # Signing Algorithm we chose, HMAC + SHA-256
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 # How long our token is valid for

    class Config:
        env_file = ".env"

settings = Settings()