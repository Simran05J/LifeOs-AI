from typing import Optional
from pydantic import BaseModel, Field, validator


class WellnessRequest(BaseModel):
    """Pydantic model representing the input payload sent to the Wellness Agent."""
    user_message: str = Field(..., description="The user's wellness-related message or concern. Cannot be empty.")
    mood: Optional[str] = Field(default=None, description="The user's current mood (e.g., happy, anxious, sad).")
    stress_level: Optional[int] = Field(default=None, description="The user's current stress level on a scale of 1 to 10.")
    goals: Optional[str] = Field(default=None, description="The user's wellness goals (e.g., better sleep, reduce anxiety).")
    preferences: Optional[str] = Field(default=None, description="User preferences for wellness activities (e.g., yoga, meditation, journaling).")

    @validator("user_message")
    def user_message_not_empty(cls, v: str) -> str:
        """Ensure the user message is not empty or whitespace."""
        if not v or not v.strip():
            raise ValueError("User message cannot be empty or whitespace.")
        return v.strip()

    @validator("stress_level")
    def stress_level_must_be_valid(cls, v: Optional[int]) -> Optional[int]:
        """Ensure stress level is within the valid range of 1 to 10."""
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Stress level must be between 1 and 10.")
        return v
