import logging
import uuid
from datetime import datetime
from typing import List, Optional
from app.firebase import (
    get_document, 
    set_document, 
    update_document, 
    delete_document, 
    query_documents
)
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskStatus

logger = logging.getLogger(__name__)

TASK_COLLECTION = "tasks"

class TaskService:
    @staticmethod
    async def create_task(user_id: str, task_data: TaskCreate) -> TaskResponse:
        """
        Create a new task document in Firestore.
        """
        task_id = str(uuid.uuid4())
        logger.info(f"Creating task {task_id} for user {user_id}")
        
        try:
            now = datetime.utcnow()
            data = task_data.model_dump()
            
            # Set compatibility fields for frontend dashboard (which expects startDate/endDate and completed)
            due_date = data.get("due_date")
            data.update({
                "id": task_id,
                "user_id": user_id,
                "startDate": due_date or now,
                "start_date": due_date or now,
                "endDate": due_date or now,
                "end_date": due_date or now,
                "completed": data.get("status") == "completed",
                "source": data.get("source") or "ai",
                # Write both camelCase and snake_case timestamps so frontend
                # onSnapshot queries ordering by 'createdAt' work correctly.
                "createdAt": now,
                "created_at": now,
                "updatedAt": now,
                "updated_at": now
            })
            
            set_document(f"users/{user_id}/planner", task_id, data)
            logger.info(f"Task {task_id} successfully created.")
            return TaskResponse(**data)
        except Exception as e:
            logger.error(f"Error creating task for user {user_id}: {str(e)}")
            raise

    @staticmethod
    async def get_task(user_id: str, task_id: str) -> Optional[TaskResponse]:
        """
        Retrieve a specific task. Ensures ownership validation.
        """
        logger.info(f"Retrieving task {task_id} for user {user_id}")
        try:
            doc = get_document(f"users/{user_id}/planner", task_id)
            if not doc:
                logger.info(f"Task {task_id} not found.")
                return None
                
            # Ownership check
            if doc.get("user_id") != user_id:
                logger.warning(f"Unauthorized access attempt by user {user_id} on task {task_id}")
                raise PermissionError("Access denied: You do not own this task.")
                
            return TaskResponse(**doc)
        except Exception as e:
            logger.error(f"Error retrieving task {task_id}: {str(e)}")
            raise

    @staticmethod
    async def update_task(user_id: str, task_id: str, task_data: TaskUpdate) -> TaskResponse:
        """
        Update an existing task. Ensures ownership validation.
        """
        logger.info(f"Updating task {task_id} for user {user_id}")
        try:
            # Check existence and ownership
            existing = await TaskService.get_task(user_id, task_id)
            if not existing:
                raise ValueError("Task not found.")
                
            now = datetime.utcnow()
            update_dict = task_data.model_dump(exclude_unset=True)
            if not update_dict:
                return existing
                
            update_dict["updated_at"] = now
            update_document(f"users/{user_id}/planner", task_id, update_dict)
            
            # Retrieve updated document
            updated_doc = get_document(f"users/{user_id}/planner", task_id)
            logger.info(f"Task {task_id} successfully updated.")
            return TaskResponse(**updated_doc)
        except Exception as e:
            logger.error(f"Error updating task {task_id}: {str(e)}")
            raise

    @staticmethod
    async def delete_task(user_id: str, task_id: str) -> None:
        """
        Delete a specific task. Ensures ownership validation.
        """
        logger.info(f"Deleting task {task_id} for user {user_id}")
        try:
            # Check ownership
            existing = await TaskService.get_task(user_id, task_id)
            if not existing:
                raise ValueError("Task not found.")
                
            delete_document(f"users/{user_id}/planner", task_id)
            logger.info(f"Task {task_id} successfully deleted.")
        except Exception as e:
            logger.error(f"Error deleting task {task_id}: {str(e)}")
            raise

    @staticmethod
    async def list_tasks(user_id: str) -> List[TaskResponse]:
        """
        List all tasks belonging to a specific user.
        """
        logger.info(f"Listing tasks for user: {user_id}")
        try:
            from app.firebase.firebase import list_documents
            docs = list_documents(f"users/{user_id}/planner")
            result = []
            for doc in docs:
                try:
                    result.append(TaskResponse(**doc))
                except Exception as parse_err:
                    logger.error(f"Failed to parse task document {doc.get('id')}: {str(parse_err)}")
            return result
        except Exception as e:
            logger.error(f"Error listing tasks for user {user_id}: {str(e)}")
            raise

    @staticmethod
    async def list_tasks_by_status(user_id: str, status: TaskStatus) -> List[TaskResponse]:
        """
        List tasks filtered by user ownership and execution status.
        """
        logger.info(f"Listing tasks with status {status} for user {user_id}")
        try:
            # Firestore client handles multiple where filters cleanly
            # For simplicity using Python filtering over user tasks
            user_tasks = await TaskService.list_tasks(user_id)
            return [task for task in user_tasks if task.status == status]
        except Exception as e:
            logger.error(f"Error filtering tasks by status for user {user_id}: {str(e)}")
            raise
