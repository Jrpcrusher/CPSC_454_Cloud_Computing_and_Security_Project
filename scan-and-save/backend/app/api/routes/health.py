# Route that AWS services can ping, they can ping "/health" to know that the backend is online
# and that the container is healthy

from fastapi import APIRouter

router = APIRouter()

@router.get("/") # Handles getting the health of the endpoint
def health():
    return {"status": "ok"} # Return the status ok to the router