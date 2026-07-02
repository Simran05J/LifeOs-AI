from pydantic import BaseModel, Field
from typing import Optional

class SettingsRequest(BaseModel):
    theme: Optional[str] = Field(default="system", pattern="^(light|dark|system)$", description="Application styling theme")
    notifications_enabled: Optional[bool] = Field(default=True, description="Enable push notifications")
    email_notifications_enabled: Optional[bool] = Field(default=True, description="Enable email digests and alerts")
    language: Optional[str] = Field(default="en", min_length=2, max_length=5, description="ISO-639-1 language code, e.g. 'en', 'es'")

class SettingsResponse(BaseModel):
    user_id: str = Field(..., description="Owner User ID (UID)")
    theme: str = Field(..., description="Active styling theme")
    notifications_enabled: bool = Field(..., description="State of push notifications")
    email_notifications_enabled: bool = Field(..., description="State of email notifications")
    language: str = Field(..., description="Preferred language code")

    class Config:
        from_attributes = True
