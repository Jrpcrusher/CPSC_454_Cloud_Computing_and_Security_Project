from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URI: str
    DB_NAME: str
    STRIPE_SECRET_KEY: str | None = None       # Stripe secret key for server-side API calls
    STRIPE_PUBLISHABLE_KEY: str | None = None   # Stripe publishable key exposed to frontend
    STRIPE_WEBHOOK_SECRET: str | None = None    # Secret for verifying Stripe webhook signatures
    PLATFORM_FEE_PERCENT: float = 10.0          # Platform commission percentage (e.g. 10%)
    AWS_REGION: str | None = None               # We have the AWS region, or not

    class Config:
        env_file = ".env"

settings = Settings()