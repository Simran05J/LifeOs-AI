from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any

router = APIRouter()

@router.post("/login", response_model=dict)
async def login() -> Any:
    """
    Placeholder for login/token exchange endpoint.
    """
    return {"message": "Auth login endpoint placeholder"}

@router.post("/verify-token", response_model=dict)
async def verify_token() -> Any:
    """
    Placeholder for Firebase ID token verification.
    """
    return {"message": "Auth verify-token endpoint placeholder"}
