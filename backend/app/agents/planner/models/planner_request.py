from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, validator


class PlannerTask(BaseModel):
    """Pydantic model representing a task or plan in the user's planner collection."""
    title: str = Field(..., description="The title of the task. Cannot be empty.")
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    priority: str
    status: str

    @validator("title")
    def title_not_empty(cls, v: str) -> str:
        """Ensure task title is not empty or whitespace."""
        if not v or not v.strip():
            raise ValueError("Task title cannot be empty or whitespace.")
        return v.strip()


class PlannerRequest(BaseModel):
    """Pydantic model representing a request payload sent to the Planner Agent."""
    query: str = Field(..., description="The user query. Cannot be empty.")
    target_date: date
    existing_tasks: list[PlannerTask] = Field(default_factory=list)

    @validator("query")
    def query_not_empty(cls, v: str) -> str:
        """Ensure user query is not empty or whitespace."""
        if not v or not v.strip():
            raise ValueError("Query cannot be empty or whitespace.")
        return v.strip()
