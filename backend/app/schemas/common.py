from pydantic import BaseModel, Field
from typing import Any, Optional, List, Generic, TypeVar

T = TypeVar("T")

class SuccessResponse(BaseModel):
    success: bool = Field(default=True, description="Indicates whether the request was successful")
    message: str = Field(..., description="User-friendly feedback message")
    data: Optional[Any] = Field(default=None, description="Response payload")

class ErrorResponse(BaseModel):
    success: bool = Field(default=False, description="Indicates whether the request was successful")
    error: str = Field(..., description="Error type or code description")
    detail: Optional[Any] = Field(default=None, description="Detailed error information or debug trace")

class PaginationResponse(BaseModel, Generic[T]):
    items: List[T] = Field(..., description="List of items on the current page")
    total: int = Field(..., ge=0, description="Total number of items available")
    page: int = Field(..., ge=1, description="Current page number (1-indexed)")
    size: int = Field(..., ge=1, description="Page size (number of items per page)")
    pages: int = Field(..., ge=0, description="Total pages available")
