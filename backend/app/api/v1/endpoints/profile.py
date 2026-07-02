from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse
from app.schemas.common import SuccessResponse
from app.schemas.user import AuthUser
from app.core.security import get_current_user
from app.services.profile_service import ProfileService

router = APIRouter()

@router.get("/", response_model=SuccessResponse)
async def read_profile(current_user: AuthUser = Depends(get_current_user)) -> SuccessResponse:
    """
    Get current user profile details.
    """
    profile = await ProfileService.get_profile(current_user.uid)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found for this user."
        )
    return SuccessResponse(
        success=True,
        message="Profile retrieved successfully",
        data=profile
    )

@router.post("/", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_data: ProfileCreate,
    current_user: AuthUser = Depends(get_current_user)
) -> SuccessResponse:
    """
    Create profile details for the authenticated user.
    """
    try:
        profile = await ProfileService.create_profile(current_user.uid, profile_data)
        return SuccessResponse(
            success=True,
            message="Profile created successfully",
            data=profile
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/", response_model=SuccessResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: AuthUser = Depends(get_current_user)
) -> SuccessResponse:
    """
    Update profile details for the authenticated user.
    """
    try:
        profile = await ProfileService.update_profile(current_user.uid, profile_data)
        return SuccessResponse(
            success=True,
            message="Profile updated successfully",
            data=profile
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
