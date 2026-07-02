from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskStatus
from app.schemas.common import SuccessResponse
from app.schemas.user import AuthUser
from app.core.security import get_current_user
from app.services.task_service import TaskService

router = APIRouter()

@router.post("/", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    current_user: AuthUser = Depends(get_current_user)
) -> SuccessResponse:
    """
    Create a new task.
    """
    task = await TaskService.create_task(current_user.uid, task_data)
    return SuccessResponse(
        success=True,
        message="Task created successfully",
        data=task
    )

@router.get("/", response_model=SuccessResponse)
async def list_tasks(
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    current_user: AuthUser = Depends(get_current_user)
) -> SuccessResponse:
    """
    List all tasks for the authenticated user, with optional filter by task status.
    """
    if status_filter:
        tasks = await TaskService.list_tasks_by_status(current_user.uid, status_filter)
    else:
        tasks = await TaskService.list_tasks(current_user.uid)
        
    return SuccessResponse(
        success=True,
        message="Tasks retrieved successfully",
        data=tasks
    )

@router.put("/{id}", response_model=SuccessResponse)
async def update_task(
    id: str,
    task_data: TaskUpdate,
    current_user: AuthUser = Depends(get_current_user)
) -> SuccessResponse:
    """
    Update a task by ID. Owner authorization check is performed.
    """
    try:
        task = await TaskService.update_task(current_user.uid, id, task_data)
        return SuccessResponse(
            success=True,
            message="Task updated successfully",
            data=task
        )
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))

@router.delete("/{id}", response_model=SuccessResponse)
async def delete_task(
    id: str,
    current_user: AuthUser = Depends(get_current_user)
) -> SuccessResponse:
    """
    Delete a task by ID. Owner authorization check is performed.
    """
    try:
        await TaskService.delete_task(current_user.uid, id)
        return SuccessResponse(
            success=True,
            message="Task deleted successfully"
        )
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
