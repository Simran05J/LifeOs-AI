from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.settings import SettingsRequest, SettingsResponse
from app.schemas.common import SuccessResponse
from app.schemas.user import AuthUser
from app.core.security import get_current_user
from app.services.settings_service import SettingsService

router = APIRouter()

@router.get("/", response_model=SuccessResponse)
async def read_settings(current_user: AuthUser = Depends(get_current_user)) -> SuccessResponse:
    """
    Retrieve application settings for the authenticated user.
    """
    settings = await SettingsService.get_settings(current_user.uid)
    return SuccessResponse(
        success=True,
        message="Settings retrieved successfully",
        data=settings
    )

@router.put("/", response_model=SuccessResponse)
async def update_settings(
    settings_data: SettingsRequest,
    current_user: AuthUser = Depends(get_current_user)
) -> SuccessResponse:
    """
    Update application settings for the authenticated user.
    """
    settings = await SettingsService.update_settings(current_user.uid, settings_data)
    return SuccessResponse(
        success=True,
        message="Settings updated successfully",
        data=settings
    )
