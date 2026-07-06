import uuid
import logging
from datetime import datetime
from app.firebase import set_document

logger = logging.getLogger(__name__)

class TravelService:
    @staticmethod
    def create_trip(user_id: str, destination: str, budget: float, start_date: datetime, end_date: datetime, itinerary: list = None, packing_list: list = None) -> dict:
        """
        Create a new trip document in Firestore subcollection users/{user_id}/travel.
        """
        trip_id = str(uuid.uuid4())
        data = {
            "id": trip_id,
            "user_id": user_id,
            "destination": destination,
            "budget": budget,
            "startDate": start_date,
            "start_date": start_date,
            "endDate": end_date,
            "end_date": end_date,
            "itinerary": itinerary or [],
            "packing_list": packing_list or [],
            "status": "planned",
            "source": "ai",
            "agentGenerated": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        set_document(f"users/{user_id}/travel", trip_id, data)
        logger.info(f"Trip {trip_id} successfully created for user {user_id} in users/{user_id}/travel.")
        return data

    @staticmethod
    def update_trip(user_id: str, trip_id: str, updates: dict) -> dict:
        """
        Update specific fields of a trip document.
        """
        from app.firebase import update_document, get_document
        updates["updated_at"] = datetime.utcnow()
        # Ensure string dates are converted to datetime if present
        for df in ["startDate", "start_date", "endDate", "end_date"]:
            if df in updates and isinstance(updates[df], str):
                try:
                    clean_date = updates[df].split('T')[0].split(' ')[0]
                    updates[df] = datetime.fromisoformat(clean_date)
                except ValueError:
                    pass
        update_document(f"users/{user_id}/travel", trip_id, updates)
        logger.info(f"Trip {trip_id} successfully updated for user {user_id}.")
        return get_document(f"users/{user_id}/travel", trip_id)

    @staticmethod
    def delete_trip(user_id: str, trip_id: str) -> None:
        """
        Delete a trip document.
        """
        from app.firebase import delete_document
        delete_document(f"users/{user_id}/travel", trip_id)
        logger.info(f"Trip {trip_id} successfully deleted for user {user_id}.")
