import logging
from typing import Optional
from app.firebase import get_document, set_document, update_document
from app.schemas.settings import SettingsRequest, SettingsResponse

logger = logging.getLogger(__name__)

SETTINGS_COLLECTION = "settings"

class SettingsService:
    @staticmethod
    async def get_settings(user_id: str) -> SettingsResponse:
        """
        Retrieve application settings for a specific user.
        Creates default settings if none exist yet.
        """
        logger.info(f"Retrieving settings for user: {user_id}")
        try:
            doc = get_document(SETTINGS_COLLECTION, user_id)
            if not doc:
                logger.info(f"No settings document found for user {user_id}. Initializing defaults...")
                default_data = {
                    "user_id": user_id,
                    "theme": "system",
                    "notifications_enabled": True,
                    "email_notifications_enabled": True,
                    "language": "en"
                }
                set_document(SETTINGS_COLLECTION, user_id, default_data)
                return SettingsResponse(**default_data)
            
            # Map standard format response
            return SettingsResponse(**doc)
        except Exception as e:
            logger.error(f"Error retrieving settings for user {user_id}: {str(e)}")
            raise

    @staticmethod
    async def update_settings(user_id: str, settings_data: SettingsRequest) -> SettingsResponse:
        """
        Update user application settings in Firestore.
        """
        logger.info(f"Updating settings for user: {user_id}")
        try:
            # Check settings exist or initialize them first
            existing = await SettingsService.get_settings(user_id)
            
            update_dict = settings_data.model_dump(exclude_unset=True)
            if not update_dict:
                return existing
                
            update_document(SETTINGS_COLLECTION, user_id, update_dict)
            logger.info(f"Settings successfully updated for user: {user_id}")
            
            # Get updated document representation
            updated_doc = get_document(SETTINGS_COLLECTION, user_id)
            return SettingsResponse(**updated_doc)
        except Exception as e:
            logger.error(f"Error updating settings for user {user_id}: {str(e)}")
            raise
