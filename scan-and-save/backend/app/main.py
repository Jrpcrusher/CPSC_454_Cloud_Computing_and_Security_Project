# Set up the initial connectivity for HTTP requests using FastAPI
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.__init__ import admin_router, authenticator_router, health_router, items_router, orders_router, uploads_router

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

    app.include_router(admin_router, prefix="/admin", tags=["admin"])
    app.include_router(authenticator_router, prefix="/auth", tags=["auth"])
    app.include_router(health_router, prefix="/health", tags=["health"])
    app.include_router(items_router, prefix="/items", tags=["items"])
    app.include_router(orders_router, prefix="/orders", tags=["orders"])
    app.include_router(uploads_router, prefix="/uploads", tags=["uploads"])


    @app.get("/") # Gets the initial status that the api is running
    def root():
        return {"message": "Backend API Running"}
    return app

app = create_app()