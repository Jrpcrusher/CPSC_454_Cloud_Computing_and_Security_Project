# Set up the initial connectivity for HTTP requests using FastAPI
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

    @app.get("/health") # Create a /health page, which will show the below function.
    def health():
        return {"status": "ok"}
    return app

app = create_app()