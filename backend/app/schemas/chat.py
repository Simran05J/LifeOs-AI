from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ChatRequest(BaseModel):
    message: str = Field(
        ..., 
        min_length=1, 
        max_length=5000, 
        description="The chat message content sent by the user"
    )
    session_id: Optional[str] = Field(
        None, 
        description="Unique identifier for the chat session, if continuing an existing conversation"
    )
    local_time: Optional[str] = Field(
        None,
        description="ISO string of the client's local time"
    )
    timezone: Optional[str] = Field(
        None,
        description="IANA timezone identifier of the client"
    )
    locale: Optional[str] = Field(
        None,
        description="BCP 47 locale string of the client (e.g. en-IN)"
    )

class ChatResponse(BaseModel):
    message: str = Field(..., description="The response message content from the system/AI agent")
    session_id: str = Field(..., description="Unique identifier for the chat session")
    response_id: str = Field(..., description="Unique ID for this specific message response")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp when the response was created")
    actions_executed: Optional[list[dict]] = Field(None, description="List of structured actions executed by the agent(s)")
    session_title: Optional[str] = Field(None, description="Automatically generated title for the session, if it is a new conversation")
