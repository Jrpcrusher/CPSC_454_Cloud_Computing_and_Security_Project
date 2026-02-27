from fastapi import APIRouter

router = APIRouter()

@router.get("/") # Handles getting the health of the endpoint
def health():
    return {"status": "ok"} # Return the status ok to the router