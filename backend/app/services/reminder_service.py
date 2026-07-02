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
            data.update({
                "id": reminder_id,
                "user_id": user_id,
                "created_at": now,
                "updated_at": now
            })
            
            set_document(REMINDER_COLLECTION, reminder_id, data)
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
            doc = get_document(REMINDER_COLLECTION, reminder_id)
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
            update_document(REMINDER_COLLECTION, reminder_id, update_dict)
            
            # Retrieve updated document
            updated_doc = get_document(REMINDER_COLLECTION, reminder_id)
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
                
            delete_document(REMINDER_COLLECTION, reminder_id)
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
            docs = query_documents(REMINDER_COLLECTION, "user_id", "==", user_id)
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
