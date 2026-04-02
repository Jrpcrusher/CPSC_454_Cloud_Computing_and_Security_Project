from pydantic import BaseModel
from datetime import datetime
from .user import UserSummary
from uuid import UUID
from enum import Enum

class Status(str, Enum): # Statuses to keep track of state of order
    received = "received"
    declined = "declined"
    accepted = "accepted"
    completed = "completed"

class Order(BaseModel): # Generic order model
    order_id: UUID
    client: UserSummary
    artist: UserSummary
    order_details: str
    creation_date: datetime
    status: Status
    client_approval: bool = False
    artist_approval: bool = False
    transaction_id: UUID | None = None  # Links to Transaction (set when buyer pays)

class CreateOrderRequest(BaseModel): # The response model for when we create an order
    order_details: str

class OrderApprovalResponse(BaseModel): # The response model for order, saying if artist and client happy
    order_id: UUID
    client_approval: bool
    artist_approval: bool

class OrderDownloadResponse(BaseModel): # The resposne model for allowing the user to download (after happy)
    order_id: UUID
    unwatermarked_key: str

class UploadOrderAsset(BaseModel): # The response model for artist uploading the asset (image)
    unwatermarked_key: str

class OrderAsset(BaseModel): # The actual order with all image info, release info, and artist/client info
    order_id: UUID
    artist_id: UUID
    client_id: UUID

    watermarked_key: str
    unwatermarked_key: str

    art_uploaded: bool = False
    released_to_buyer: bool = False