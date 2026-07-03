from typing import Any, Optional
from pydantic import BaseModel, Field


class TravelResult(BaseModel):
    """Pydantic model representing the structured output of the Travel Agent execution."""
    success: bool = Field(default=True, description="Indicates if the travel plan was generated successfully.")
    destination: Optional[str] = Field(default=None, description="The resolved or confirmed travel destination.")
    itinerary: list[dict[str, Any]] = Field(default_factory=list, description="Day-by-day travel itinerary.")
    estimated_budget: dict[str, Any] = Field(default_factory=dict, description="Budget breakdown by category (e.g., accommodation, food, transport).")
    packing_list: list[str] = Field(default_factory=list, description="Recommended items to pack for the trip.")
    travel_tips: list[str] = Field(default_factory=list, description="General travel tips specific to the destination.")
    summary: str = Field(default="", description="Textual summary of the generated travel plan.")
