from datetime import datetime
from pydantic import BaseModel, Field, validator


class ReminderRequest(BaseModel):
    """Pydantic model representing the input payload sent to the Reminder Agent."""
    query: str = Field(..., description="The user query describing the reminder. Cannot be empty.")
    current_time: datetime = Field(..., description="The current timestamp to resolve relative times.")

    @validator("query")
    def query_not_empty(cls, v: str) -> str:
        """Ensure the reminder query is not empty or whitespace."""
        if not v or not v.strip():
            raise ValueError("Reminder query cannot be empty or whitespace.")
        return v.strip()
