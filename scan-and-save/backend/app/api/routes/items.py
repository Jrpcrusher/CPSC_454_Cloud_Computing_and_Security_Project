from fastapi import APIRouter

router = APIRouter()

@router.get("/") # Returns a list of all items
def list_items():
    return []

@router.get("/{item_id}") # Handles method for getting item id
def get_item(item_id: str):
    return {"item_id": item_id}

@router.post("/") # Handles creating an item
def create_item():
    return {"message": "Item Created"}

@router.delete("/{item_id}") # Handles deleting an item based on item_id
def delete_item(item_id: str):
    return {"message": "Item Deleted"}
