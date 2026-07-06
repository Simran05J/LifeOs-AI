from typing import Any, Optional
from pydantic import BaseModel, Field


class PlannerResult(BaseModel):
    """Pydantic model representing the standardized output of the Planner Agent execution."""
    success: bool = Field(default=True, description="Indicates if the plan was generated successfully.")
    generated_plan: dict[str, Any] = Field(default_factory=dict, description="The structured generated plan.")
    recommendations: list[str] = Field(default_factory=list, description="Productivity or wellness recommendations.")
    summary: str = Field(default="", description="Textual summary of the planning process.")
    actions: Optional[list[dict[str, Any]]] = Field(default=None, description="CRUD actions to execute.")
