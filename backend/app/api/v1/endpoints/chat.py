from fastapi import APIRouter, Depends, status
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.common import SuccessResponse
from app.schemas.user import AuthUser
from app.core.security import get_current_user
from app.services.chat_service import ChatService

router = APIRouter()

@router.post("/", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
async def send_chat_message(
    request: ChatRequest,
    current_user: AuthUser = Depends(get_current_user)
) -> SuccessResponse:
    """
    Accepts user chat messages, forwards them to the chat service interface, 
    and returns a standardized response.
    """
    chat_response: ChatResponse = await ChatService.process_chat_message(
        request=request, 
        user_id=current_user.uid
    )
    return SuccessResponse(
        success=True,
        message="Chat message processed successfully",
        data=chat_response
    )
