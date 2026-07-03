from typing import Any, Optional
from pydantic import BaseModel, Field, validator


class ExpenseRecord(BaseModel):
    """Pydantic model representing a single transaction record."""
    amount: float = Field(..., description="The amount spent. Must be positive.")
    category: str = Field(..., description="The expense category (e.g., Food, Travel).")
    description: Optional[str] = Field(default=None, description="Optional description of the transaction.")
    merchant: Optional[str] = Field(default=None, description="Optional merchant name.")
    date: str = Field(..., description="The transaction date (ISO format).")

    @validator("amount")
    def amount_must_be_positive(cls, v: float) -> float:
        """Ensure that the transaction amount is positive."""
        if v <= 0:
            raise ValueError("Amount must be greater than zero.")
        return v


class FinanceRequest(BaseModel):
    """Pydantic model representing the input payload sent to the Finance Agent."""
    query: str = Field(..., description="The user query or concern regarding finances. Cannot be empty.")
    expense_records: list[ExpenseRecord] = Field(default_factory=list, description="List of expense records to analyze.")

    @validator("query")
    def query_not_empty(cls, v: str) -> str:
        """Ensure that the user query is not empty or whitespace."""
        if not v or not v.strip():
            raise ValueError("Query cannot be empty or whitespace.")
        return v.strip()
