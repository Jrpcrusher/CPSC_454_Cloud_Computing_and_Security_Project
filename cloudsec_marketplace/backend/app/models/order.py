from pydantic import BaseModel
from datetime import datetime
from .user import UserSummary
from uuid import UUID
from enum import Enum

class Status(str, Enum):
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
    transaction_id: UUID | None = None  # Links to Transaction (set when buyer pays)

class CreateOrderRequest(BaseModel):
    order_details: str