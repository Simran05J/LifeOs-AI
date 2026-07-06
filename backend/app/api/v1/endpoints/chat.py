from fastapi import APIRouter, Depends, status, HTTPException
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.common import SuccessResponse
from app.schemas.user import AuthUser
from app.core.security import get_current_user
from app.services.chat_service import ChatService
from app.agents.shared.exceptions import AgentValidationError, AgentExecutionError
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
@router.post("/", response_model=SuccessResponse, status_code=status.HTTP_200_OK, include_in_schema=False)
async def send_chat_message(
    request: ChatRequest,
    current_user: AuthUser = Depends(get_current_user)
) -> SuccessResponse:
    """
    Accepts user chat messages, forwards them to the chat service interface, 
    and returns a standardized response.
    """
    logger.info("POST /api/v1/chat called by user_id: %s", current_user.uid)
    try:
        chat_response: ChatResponse = await ChatService.process_chat_message(
            request=request, 
            user_id=current_user.uid
        )
        return SuccessResponse(
            success=True,
            message="Chat message processed successfully",
            data=chat_response
        )
    except AgentValidationError as exc:
        logger.warning("Validation error in chat request from user %s: %s", current_user.uid, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )
    except AgentExecutionError as exc:
        logger.error("Execution error while processing chat for user %s: %s", current_user.uid, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {str(exc)}"
        )
    except Exception as exc:
        logger.error("Unexpected error while processing chat for user %s: %s", current_user.uid, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your message."
        )


@router.delete("/{session_id}", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
async def delete_chat_session(
    session_id: str,
    current_user: AuthUser = Depends(get_current_user)
) -> SuccessResponse:
    """
    Deletes a chat session and all its messages for the authenticated user.
    """
    logger.info("DELETE /api/v1/chat/%s called by user_id: %s", session_id, current_user.uid)
    try:
        await ChatService.delete_chat_session(session_id=session_id, user_id=current_user.uid)
        return SuccessResponse(
            success=True,
            message="Conversation deleted successfully",
            data=None
        )
    except PermissionError as exc:
        logger.warning("Permission error for user %s on session %s: %s", current_user.uid, session_id, exc)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc)
        )
    except ValueError as exc:
        logger.warning("Value error for user %s on session %s: %s", current_user.uid, session_id, exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc)
        )
    except Exception as exc:
        logger.error("Unexpected error deleting session %s for user %s: %s", session_id, current_user.uid, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while deleting the conversation."
        )


