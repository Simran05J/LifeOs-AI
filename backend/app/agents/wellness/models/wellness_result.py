from pydantic import BaseModel, Field
from typing import Optional, Any


class WellnessResult(BaseModel):
    """Pydantic model representing the structured output of the Wellness Agent execution."""
    success: bool = Field(default=True, description="Indicates if the wellness analysis was completed successfully.")
    mood_analysis: str = Field(default="", description="AI analysis of the user's current emotional and mental state.")
    recommendations: list[str] = Field(default_factory=list, description="Personalized wellness activity recommendations.")
    healthy_routine: list[str] = Field(default_factory=list, description="Suggested daily healthy routine steps.")
    wellness_tips: list[str] = Field(default_factory=list, description="General wellness tips tailored to the user's context.")
    summary: str = Field(default="", description="Overall textual summary of the wellness guidance provided.")
    logged_activity: Optional[dict[str, Any]] = Field(default=None, description="Details of wellness activity logged, if any.")
    actions: Optional[list[dict[str, Any]]] = Field(default=None, description="CRUD actions to execute.")
