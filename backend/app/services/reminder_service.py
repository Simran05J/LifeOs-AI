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
from app.schemas.reminder import ReminderCreate, ReminderUpdate, ReminderResponse

logger = logging.getLogger(__name__)

REMINDER_COLLECTION = "reminders"

class ReminderService:
    @staticmethod
    async def create_reminder(user_id: str, reminder_data: ReminderCreate) -> ReminderResponse:
        """
        Create a new reminder document in Firestore.
        """
        reminder_id = str(uuid.uuid4())
        logger.info(f"Creating reminder {reminder_id} for user {user_id}")
        
        try:
            now = datetime.utcnow()
            data = reminder_data.model_dump()
            
            # Format time/date for frontend compatibility
            remind_at = reminder_data.remind_at
            date_str = remind_at.strftime("%Y-%m-%d")
            time_str = remind_at.strftime("%H:%M:%S")
            
            data.update({
                "id": reminder_id,
                "user_id": user_id,
                "date": date_str,
                "time": time_str,
                "startDate": date_str,
                "start_date": date_str,
                "remindAt": remind_at,
                "completed": data.get("is_completed", False),
                "source": "ai",
                "voiceCreated": True,
                "agentGenerated": True,
                "voiceNotification": True,
                "notificationEnabled": True,
                "browserNotification": True,
                # Write both camelCase and snake_case timestamps so the frontend
                # onSnapshot query ordering by 'createdAt' works correctly.
                "createdAt": now,
                "created_at": now,
                "updatedAt": now,
                "updated_at": now
            })
            
            set_document(f"users/{user_id}/reminders", reminder_id, data)
            logger.info(f"Reminder {reminder_id} successfully created.")
            return ReminderResponse(**data)
        except Exception as e:
            logger.error(f"Error creating reminder for user {user_id}: {str(e)}")
            raise

    @staticmethod
    async def get_reminder(user_id: str, reminder_id: str) -> Optional[ReminderResponse]:
        """
        Retrieve a specific reminder. Ensures ownership validation.
        """
        logger.info(f"Retrieving reminder {reminder_id} for user {user_id}")
        try:
            doc = get_document(f"users/{user_id}/reminders", reminder_id)
            if not doc:
                logger.info(f"Reminder {reminder_id} not found.")
                return None
                
            # Ownership check
            if doc.get("user_id") != user_id:
                logger.warning(f"Unauthorized access attempt by user {user_id} on reminder {reminder_id}")
                raise PermissionError("Access denied: You do not own this reminder.")
                
            return ReminderResponse(**doc)
        except Exception as e:
            logger.error(f"Error retrieving reminder {reminder_id}: {str(e)}")
            raise

    @staticmethod
    async def update_reminder(user_id: str, reminder_id: str, reminder_data: ReminderUpdate) -> ReminderResponse:
        """
        Update an existing reminder. Ensures ownership validation.
        """
        logger.info(f"Updating reminder {reminder_id} for user {user_id}")
        try:
            # Check existence and ownership
            existing = await ReminderService.get_reminder(user_id, reminder_id)
            if not existing:
                raise ValueError("Reminder not found.")
                
            now = datetime.utcnow()
            update_dict = reminder_data.model_dump(exclude_unset=True)
            if not update_dict:
                return existing
                
            update_dict["updated_at"] = now
            update_document(f"users/{user_id}/reminders", reminder_id, update_dict)
            
            # Retrieve updated document
            updated_doc = get_document(f"users/{user_id}/reminders", reminder_id)
            logger.info(f"Reminder {reminder_id} successfully updated.")
            return ReminderResponse(**updated_doc)
        except Exception as e:
            logger.error(f"Error updating reminder {reminder_id}: {str(e)}")
            raise

    @staticmethod
    async def delete_reminder(user_id: str, reminder_id: str) -> None:
        """
        Delete a specific reminder. Ensures ownership validation.
        """
        logger.info(f"Deleting reminder {reminder_id} for user {user_id}")
        try:
            # Check ownership
            existing = await ReminderService.get_reminder(user_id, reminder_id)
            if not existing:
                raise ValueError("Reminder not found.")
                
            delete_document(f"users/{user_id}/reminders", reminder_id)
            logger.info(f"Reminder {reminder_id} successfully deleted.")
        except Exception as e:
            logger.error(f"Error deleting reminder {reminder_id}: {str(e)}")
            raise

    @staticmethod
    async def list_reminders(user_id: str) -> List[ReminderResponse]:
        """
        List all reminders belonging to a specific user.
        """
        logger.info(f"Listing reminders for user: {user_id}")
        try:
            from app.firebase.firebase import list_documents
            docs = list_documents(f"users/{user_id}/reminders")
            result = []
            for doc in docs:
                try:
                    result.append(ReminderResponse(**doc))
                except Exception as parse_err:
                    logger.error(f"Failed to parse reminder document {doc.get('id')}: {str(parse_err)}")
            return result
        except Exception as e:
            logger.error(f"Error listing reminders for user {user_id}: {str(e)}")
            raise
