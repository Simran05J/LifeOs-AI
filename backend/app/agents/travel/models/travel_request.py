from datetime import date
from typing import Optional
from pydantic import BaseModel, Field, validator


class TravelRequest(BaseModel):
    """Pydantic model representing the input payload sent to the Travel Agent."""
    query: str = Field(..., description="The user's query or instruction.")
    destination: Optional[str] = Field(default=None, description="The travel destination.")
    budget: Optional[float] = Field(default=None, description="The total travel budget in the user's currency.")
    start_date: Optional[date] = Field(default=None, description="The trip start date.")
    end_date: Optional[date] = Field(default=None, description="The trip end date.")
    traveler_count: Optional[int] = Field(default=1, description="Number of travelers. Must be at least 1.")
    preferences: Optional[str] = Field(default=None, description="Optional travel preferences.")

    @validator("destination")
    def destination_not_empty(cls, v: Optional[str]) -> Optional[str]:
        """Ensure the destination is not empty if provided."""
        if v is not None and not v.strip():
            raise ValueError("Destination cannot be empty or whitespace.")
        return v.strip() if v else None

    @validator("budget")
    def budget_must_be_positive(cls, v: Optional[float]) -> Optional[float]:
        """Ensure the budget is positive if provided."""
        if v is not None and v <= 0:
            raise ValueError("Budget must be greater than zero.")
        return v

    @validator("traveler_count")
    def traveler_count_must_be_valid(cls, v: Optional[int]) -> Optional[int]:
        """Ensure traveler count is valid if provided."""
        if v is not None and v < 1:
            raise ValueError("Traveler count must be at least 1.")
        return v

    @validator("end_date")
    def end_date_must_be_after_start_date(cls, v: Optional[date], values: dict) -> Optional[date]:
        """Ensure end date is on or after start date if both are provided."""
        start_date = values.get("start_date")
        if start_date and v and v < start_date:
            raise ValueError("end_date must be on or after start_date.")
        return v
