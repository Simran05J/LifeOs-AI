import logging
from datetime import datetime
from typing import Optional
from app.firebase import get_document, set_document, update_document
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse

logger = logging.getLogger(__name__)

PROFILE_COLLECTION = "profiles"

class ProfileService:
    @staticmethod
    async def get_profile(user_id: str) -> Optional[ProfileResponse]:
        """
        Fetch a user profile by user_id from Firestore.
        """
        logger.info(f"Fetching profile for user: {user_id}")
        try:
            doc = get_document(PROFILE_COLLECTION, user_id)
            if not doc:
                logger.info(f"No profile found for user: {user_id}")
                return None
            return ProfileResponse(**doc)
        except Exception as e:
            logger.error(f"Error fetching profile for user {user_id}: {str(e)}")
            raise

    @staticmethod
    async def create_profile(user_id: str, profile_data: ProfileCreate) -> ProfileResponse:
        """
        Create a new user profile document in Firestore.
        """
        logger.info(f"Creating profile for user: {user_id}")
        try:
            # Check if profile already exists
            existing = await ProfileService.get_profile(user_id)
            if existing:
                logger.warning(f"Profile already exists for user: {user_id}")
                raise ValueError("Profile already exists for this user.")

            now = datetime.utcnow()
            data = profile_data.model_dump()
            data.update({
                "uid": user_id,
                "created_at": now,
                "updated_at": now
            })
            
            set_document(PROFILE_COLLECTION, user_id, data)
            logger.info(f"Profile successfully created for user: {user_id}")
            return ProfileResponse(**data)
        except Exception as e:
            logger.error(f"Error creating profile for user {user_id}: {str(e)}")
            raise

    @staticmethod
    async def update_profile(user_id: str, profile_data: ProfileUpdate) -> ProfileResponse:
        """
        Update an existing user profile document in Firestore.
        """
        logger.info(f"Updating profile for user: {user_id}")
        try:
            # Check if profile exists
            existing = await ProfileService.get_profile(user_id)
            if not existing:
                logger.warning(f"Profile does not exist for user: {user_id}")
                raise ValueError("Profile does not exist.")

            now = datetime.utcnow()
            update_dict = profile_data.model_dump(exclude_unset=True)
            if not update_dict:
                return existing

            update_dict["updated_at"] = now
            update_document(PROFILE_COLLECTION, user_id, update_dict)
            
            # Retrieve updated document
            updated_doc = get_document(PROFILE_COLLECTION, user_id)
            logger.info(f"Profile successfully updated for user: {user_id}")
            return ProfileResponse(**updated_doc)
        except Exception as e:
            logger.error(f"Error updating profile for user {user_id}: {str(e)}")
            raise
