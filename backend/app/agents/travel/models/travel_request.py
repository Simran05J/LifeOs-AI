from datetime import date
from typing import Optional
from pydantic import BaseModel, Field, validator


class TravelRequest(BaseModel):
    """Pydantic model representing the input payload sent to the Travel Agent."""
    destination: str = Field(..., description="The travel destination. Cannot be empty.")
    budget: float = Field(..., description="The total travel budget in the user's currency. Must be positive.")
    start_date: date = Field(..., description="The trip start date.")
    end_date: date = Field(..., description="The trip end date.")
    traveler_count: int = Field(default=1, description="Number of travelers. Must be at least 1.")
    preferences: Optional[str] = Field(default=None, description="Optional travel preferences (e.g., adventure, relaxation, food).")

    @validator("destination")
    def destination_not_empty(cls, v: str) -> str:
        """Ensure the destination is not empty or whitespace."""
        if not v or not v.strip():
            raise ValueError("Destination cannot be empty or whitespace.")
        return v.strip()

    @validator("budget")
    def budget_must_be_positive(cls, v: float) -> float:
        """Ensure the budget is a positive value."""
        if v <= 0:
            raise ValueError("Budget must be greater than zero.")
        return v

    @validator("traveler_count")
    def traveler_count_must_be_valid(cls, v: int) -> int:
        """Ensure at least one traveler is specified."""
        if v < 1:
            raise ValueError("Traveler count must be at least 1.")
        return v

    @validator("end_date")
    def end_date_must_be_after_start_date(cls, v: date, values: dict) -> date:
        """Ensure end date is on or after start date."""
        start_date = values.get("start_date")
        if start_date and v < start_date:
            raise ValueError("end_date must be on or after start_date.")
        return v
