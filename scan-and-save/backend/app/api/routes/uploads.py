from fastapi import APIRouter

router = APIRouter()

@router.post("/image") # Handles upload image item
def upload_item():
    item_id = 0 # create_id() TODO: Make method to create ID for newly uploaded item
    # watermark() TODO: Make method to watermark the image so that way it cannot be stolen
    return {"item": item_id}

@router.delete("/image/{item_id}") # Handles deleting an image (user method)
def delete_item(item_id: str):
    # TODO: Make it actually delete the item
    return {"deleted": item_id}