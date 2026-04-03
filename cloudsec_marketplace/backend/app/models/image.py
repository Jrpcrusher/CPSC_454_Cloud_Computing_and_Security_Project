from pydantic import BaseModel, Field
from datetime import datetime
from .user import UserSummary
from uuid import UUID

class Image(BaseModel): # Generic image model
    image_id: UUID
    image_key: str
    image_url: str | None = None
    artist: UserSummary
    upload_date: datetime
    description: str | None = Field(default=None, max_length=500)
