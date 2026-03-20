from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URI: str
    DB_NAME: str
    STRIPE_KEY: str | None = None # We either have the stripe key or not
    AWS_REGION: str | None = None # We have the AWS region, or not
    SECRET_KEY = str # the key to hash with
    ALGORITHM = "HS256" # Signing Algorithm we chose, HMAC + SHA-256
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 # How long our token is valid for

    class Config:
        env_file = ".env"

settings = Settings()