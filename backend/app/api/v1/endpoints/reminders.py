from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.reminder import ReminderCreate, ReminderUpdate, ReminderResponse
from app.schemas.common import SuccessResponse
from app.schemas.user import AuthUser
from app.core.security import get_current_user
from app.services.reminder_service import ReminderService

router = APIRouter()

@router.post("/", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    reminder_data: ReminderCreate,
    current_user: AuthUser = Depends(get_current_user)
) -> SuccessResponse:
    """
    Create a new reminder.
    """
    reminder = await ReminderService.create_reminder(current_user.uid, reminder_data)
    return SuccessResponse(
        success=True,
        message="Reminder created successfully",
        data=reminder
    )

@router.get("/", response_model=SuccessResponse)
async def list_reminders(current_user: AuthUser = Depends(get_current_user)) -> SuccessResponse:
    """
    List all reminders for the authenticated user.
    """
    reminders = await ReminderService.list_reminders(current_user.uid)
    return SuccessResponse(
        success=True,
        message="Reminders retrieved successfully",
        data=reminders
    )

@router.put("/{id}", response_model=SuccessResponse)
async def update_reminder(
    id: str,
    reminder_data: ReminderUpdate,
    current_user: AuthUser = Depends(get_current_user)
) -> SuccessResponse:
    """
    Update a reminder by ID. Owner authorization check is performed.
    """
    try:
        reminder = await ReminderService.update_reminder(current_user.uid, id, reminder_data)
        return SuccessResponse(
            success=True,
            message="Reminder updated successfully",
            data=reminder
        )
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))

@router.delete("/{id}", response_model=SuccessResponse)
async def delete_reminder(
    id: str,
    current_user: AuthUser = Depends(get_current_user)
) -> SuccessResponse:
    """
    Delete a reminder by ID. Owner authorization check is performed.
    """
    try:
        await ReminderService.delete_reminder(current_user.uid, id)
        return SuccessResponse(
            success=True,
            message="Reminder deleted successfully"
        )
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
