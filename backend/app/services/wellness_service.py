import uuid
import logging
from datetime import datetime
from app.firebase import set_document

logger = logging.getLogger(__name__)

class WellnessService:
    @staticmethod
    def create_wellness_log(user_id: str, mood: str, stress_level: str, recommendations: list = None) -> dict:
        """
        Create a new wellness document in Firestore subcollection users/{user_id}/wellness.
        """
        wellness_id = str(uuid.uuid4())
        data = {
            "id": wellness_id,
            "user_id": user_id,
            "mood": mood,
            "stress_level": stress_level,
            "recommendations": recommendations or [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        set_document(f"users/{user_id}/wellness", wellness_id, data)
        logger.info(f"Wellness log {wellness_id} successfully created for user {user_id}.")
        return data

    @staticmethod
    def update_wellness_log(user_id: str, wellness_id: str, updates: dict) -> dict:
        """
        Update specific fields of a wellness log/goal.
        """
        from app.firebase import update_document, get_document
        updates["updatedAt"] = datetime.utcnow()
        updates["updated_at"] = datetime.utcnow()
        update_document(f"users/{user_id}/wellness", wellness_id, updates)
        logger.info(f"Wellness log {wellness_id} successfully updated.")
        return get_document(f"users/{user_id}/wellness", wellness_id)

    @staticmethod
    def delete_wellness_log(user_id: str, wellness_id: str) -> None:
        """
        Delete a wellness log/goal.
        """
        from app.firebase import delete_document
        delete_document(f"users/{user_id}/wellness", wellness_id)
        logger.info(f"Wellness log {wellness_id} successfully deleted.")

    @staticmethod
    def log_wellness_activity(user_id: str, category: str, amount: float, unit: str = "", title: str = "") -> dict:
        """
        Log/update wellness activity (like water, sleep, exercise) in users/{user_id}/wellness.
        Increments active daily goals, or creates default ones if they don't exist.
        """
        from app.firebase.firebase import get_db
        import uuid
        db = get_db()
        wellness_ref = db.collection("users").document(user_id).collection("wellness")

        # Normalize category
        category = category.lower().strip()

        # Find existing active daily goal for this category
        docs = list(wellness_ref.where("category", "==", category).where("status", "==", "active").where("frequency", "==", "daily").stream())

        found = False
        updated_data = {}
        for doc in docs:
            doc_data = doc.to_dict()
            current = float(doc_data.get("current") or 0.0)
            target = float(doc_data.get("target") or 1.0)
            
            new_current = current + amount
            new_status = "completed" if new_current >= target else "active"
            
            updated_data = {
                "current": new_current,
                "status": new_status,
                "updatedAt": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            doc.reference.update(updated_data)
            updated_data["id"] = doc.id
            updated_data["category"] = category
            updated_data["title"] = doc_data.get("title")
            found = True
            break

        if not found:
            # Determine default goals and units
            default_target = 8.0 if category == "sleep" else 2.0 if category == "water" else 30.0
            default_unit = "hr" if category == "sleep" else "L" if category == "water" else "min"
            
            new_id = str(uuid.uuid4())
            new_title = title or f"Daily {category.title()} Goal"
            
            new_data = {
                "id": new_id,
                "user_id": user_id,
                "title": new_title,
                "category": category,
                "current": amount,
                "target": default_target,
                "unit": unit or default_unit,
                "frequency": "daily",
                "status": "completed" if amount >= default_target else "active",
                "source": "ai",
                "agentGenerated": True,
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow(),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            wellness_ref.document(new_id).set(new_data)
            updated_data = new_data
            logger.info(f"Created default wellness goal {new_id} for user {user_id}.")

        logger.info(f"Wellness activity successfully logged for user {user_id}.")
        return updated_data
