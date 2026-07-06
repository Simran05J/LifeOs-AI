from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


class ReminderResult(BaseModel):
    """Pydantic model representing the structured output of the Reminder Agent execution."""
    success: bool = Field(default=True, description="Indicates if the reminder was parsed successfully.")
    reminder_title: Optional[str] = Field(default=None, description="The title of the parsed reminder.")
    reminder_description: Optional[str] = Field(default=None, description="The description or details of the reminder.")
    reminder_time: Optional[datetime] = Field(default=None, description="The scheduled date and time for the reminder.")
    recurrence: Optional[str] = Field(default=None, description="Recurrence pattern (e.g., daily, weekly, or None).")
    summary: str = Field(default="", description="Textual summary of the parsing or processing result.")
    actions: Optional[list[dict[str, Any]]] = Field(default=None, description="CRUD actions to execute.")
