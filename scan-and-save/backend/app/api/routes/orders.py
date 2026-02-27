from fastapi import APIRouter

router = APIRouter()

@router.post("/") # Method to create a new order
def create():
    return {"status": "created", "order_id": None} # replace none with actual order ID

@router.get("/") # Method to check all orders
def get_all_orders():
    return []

@router.get("/{order_id}") # Method to get information about a single order
def get_order(order_id: str):
    status = None # TODO: Get status of the order, statuses like, "pending", "waiting for artist", "money sent", etc.
    return {"order_id": order_id, "status": status}

@router.get("/{order_id}/download") # Method for the user to download the art once purchased
def download(order_id: str):
    # TODO: once the money and the art has been recieved, swap the two between the artist and the user.
    return {"status": "received"}

@router.post("/webhooks/stripe")
def call_stripe():
    return {"status": "received"}