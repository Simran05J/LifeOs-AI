from datetime import date, datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class PlannerTask(BaseModel):
    """Pydantic model representing a task or plan in the user's planner collection."""
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    priority: str
    status: str


class PlannerRequest(BaseModel):
    """Pydantic model representing a request payload sent to the Planner Agent."""
    query: str
    target_date: date
    existing_tasks: list[PlannerTask] = Field(default_factory=list)


class PlannerResult(BaseModel):
    """Pydantic model representing the output result of the Planner Agent execution."""
    schedule: list[PlannerTask]
    priorities: list[str] = Field(default_factory=list)
    time_blocks: list[dict[str, Any]] = Field(default_factory=list)
