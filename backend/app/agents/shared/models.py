from typing import Any, Optional
from pydantic import BaseModel


class AgentRequest(BaseModel):
    """Standardized request model shared across all AI agents."""

    user_id: str
    agent: str
    payload: dict[str, Any]


class AgentResponse(BaseModel):
    """Standardized response model shared across all AI agents."""

    success: bool
    agent: str
    data: Optional[dict[str, Any]] = None
    message: Optional[str] = None
    actions_executed: Optional[list[dict[str, Any]]] = None
