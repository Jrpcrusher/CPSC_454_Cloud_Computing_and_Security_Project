from fastapi import APIRouter

router = APIRouter()
"""
Endpoints:

GET     /health/status
"""

@router.get("/status") # Handles getting the health of the endpoint
def health():
    return {"status": "ok"} # Return the status ok to the router

