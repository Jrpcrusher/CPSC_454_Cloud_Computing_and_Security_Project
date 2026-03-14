# Set up the initial connectivity for HTTP requests using FastAPI
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from pymongo import MongoClient
from .api.__init__ import (
    admin_router,
    authenticator_router,
    health_router,
    user_router,
    home_router)

# This function creates a FastAPI instance
def create_app():
    app = FastAPI(title="Marketplace Backend API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # TODO: Change this eventually to the actual website name, so "https://something.com"
        allow_credentials=True, # Allows cookies and such to be sent to send credentials
        allow_methods=["*"], # All methods are allowed, such GET, POST, PUT, DELETE, etc.
        allow_headers=["*"], # Allows for all HTTP header types
    )

    # initialize all the routes we can take
    app.include_router(admin_router, prefix="/admin", tags=["admin"])
    app.include_router(authenticator_router, prefix="/auth", tags=["auth"])
    app.include_router(health_router, prefix="/health", tags=["health"])
    app.include_router(user_router, prefix="/user", tags=["user"])
    app.include_router(home_router, prefix="/home", tags=["home"])

    # attach the database on website start and close when shutdown
    @app.on_event("startup")
    def startup_db_client():
        app.mongodb_client = MongoClient(settings.MONGODB_URI)
        app.database = app.mongodb_client[settings.DB_NAME]
        print("INFO:     Connected to MongoDB database open.")

    @app.on_event("shutdown")
    def shutdown_db_client():
        app.mongodb_client.close()
        print("INFO:     Connection to MongoDB database closed")

    @app.get("/") # Gets the initial status that the api is running
    def root():
        return {"message": "Backend API Running"}
    return app

app = create_app()