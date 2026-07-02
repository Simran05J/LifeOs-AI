from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class ReminderPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class ReminderBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100, description="The title of the reminder")
    description: Optional[str] = Field(None, max_length=1000, description="Additional context or notes for the reminder")
    remind_at: datetime = Field(..., description="The scheduled date and time when the reminder triggers")
    priority: ReminderPriority = Field(default=ReminderPriority.MEDIUM, description="The priority level of the reminder")
    is_completed: bool = Field(default=False, description="Completion status of the reminder")

class ReminderCreate(ReminderBase):
    pass

class ReminderUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    remind_at: Optional[datetime] = None
    priority: Optional[ReminderPriority] = None
    is_completed: Optional[bool] = None

class ReminderResponse(ReminderBase):
    id: str = Field(..., description="Unique reminder document identifier")
    user_id: str = Field(..., description="Owner User ID (UID)")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last modification timestamp")

    class Config:
        from_attributes = True
        use_enum_values = True
