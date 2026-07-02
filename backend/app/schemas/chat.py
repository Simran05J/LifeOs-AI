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

class ChatResponse(BaseModel):
    message: str = Field(..., description="The response message content from the system/AI agent")
    session_id: str = Field(..., description="Unique identifier for the chat session")
    response_id: str = Field(..., description="Unique ID for this specific message response")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp when the response was created")
