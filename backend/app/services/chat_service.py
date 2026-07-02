import logging
import uuid
from datetime import datetime
from app.schemas.chat import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)

class ChatService:
    @staticmethod
    async def process_chat_message(request: ChatRequest, user_id: str) -> ChatResponse:
        """
        Placeholder interface that forwards the chat request to the future AI Orchestrator.
        Does NOT call Gemini, execute prompts, or run AI logic.
        """
        logger.info(f"Received chat request from user_id: {user_id}")
        logger.debug(f"Message content: '{request.message}' | Session ID: {request.session_id}")
        
        # Log forwarding operation as a placeholder
        logger.info("Forwarding request payload to the AI Orchestrator/Agent sub-layer...")
        
        # Simulated response from future AI Orchestrator
        session_id = request.session_id or str(uuid.uuid4())
        response_text = (
            f"Placeholder Response: Received message '{request.message}'. "
            "This interface is set up and will be handled by the AI Orchestrator in future phases."
        )
        
        return ChatResponse(
            message=response_text,
            session_id=session_id,
            response_id=str(uuid.uuid4()),
            created_at=datetime.utcnow()
        )
