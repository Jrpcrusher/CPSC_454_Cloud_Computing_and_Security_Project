import json
import os

import boto3
from dotenv import load_dotenv

SECRET_NAME = "jrp-gfx-backend/env"
REGION_NAME = "us-west-1"

def get_secrets() -> dict:
    client = boto3.client("secretsmanager", region_name=REGION_NAME)
    response = client.get_secret_value(SecretId=SECRET_NAME)
    return json.loads(response["SecretString"])

def load_config_values() -> dict:
    app_env = os.getenv("APP_ENV", "local")

    if app_env == "production":
        return get_secrets()
    
    load_dotenv()

    return {
        "MONGODB_URI": os.getenv("MONGODB_URI"),
        "DB_NAME": os.getenv("DB_NAME", ""),
        "STRIPE_SECRET_KEY": os.getenv("STRIPE_SECRET_KEY"),
        "STRIPE_PUBLISHABLE_KEY": os.getenv("STRIPE_PUBLISHABLE_KEY"),
        "STRIPE_WEBHOOK_SECRET": os.getenv("STRIPE_WEBHOOK_SECRET"),
        "AWS_S3_BUCKET_NAME": os.getenv("AWS_S3_BUCKET_NAME"),
        "SECRET_KEY": os.getenv("SECRET_KEY")
    }