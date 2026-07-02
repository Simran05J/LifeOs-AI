from fastapi import APIRouter, Depends, HTTPException
from typing import List, Any
from app.schemas.user import UserResponse, AuthUser
from app.core.security import get_current_user

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def read_user_me(current_user: AuthUser = Depends(get_current_user)) -> Any:
    """
    Get current user profile verified via Firebase ID Token.
    """
    return {
        "uid": current_user.uid,
        "email": current_user.email,
        "display_name": current_user.name or "Unnamed User",
        "is_active": True
    }


@router.get("/", response_model=List[UserResponse])
async def read_users() -> Any:
    """
    Retrieve all users placeholder.
    """
    return [
        {
            "uid": "placeholder-uid",
            "email": "user@example.com",
            "display_name": "John Doe",
            "is_active": True
        }
    ]
