from typing import Any
from pydantic import BaseModel, Field


class FinanceResult(BaseModel):
    """Pydantic model representing the structured output of the Finance Agent execution."""
    success: bool = Field(default=True, description="Indicates if the financial analysis was successful.")
    expense_summary: dict[str, Any] = Field(default_factory=dict, description="Summary data of expenses, categorized.")
    budget_recommendations: list[str] = Field(default_factory=list, description="Recommended budget constraints or adjustments.")
    spending_insights: list[str] = Field(default_factory=list, description="Insights about spending habits and potential savings.")
    summary: str = Field(default="", description="Textual summary of the financial analysis.")
