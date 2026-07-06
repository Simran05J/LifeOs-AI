import uuid
import logging
from datetime import datetime
from app.firebase import set_document

logger = logging.getLogger(__name__)

class FinanceService:
    @staticmethod
    def create_expense(user_id: str, amount: float, category: str, description: str, payment_method: str = "cash", transaction_date: datetime = None) -> dict:
        """
        Create a new expense document in Firestore subcollection users/{user_id}/finance.
        """
        expense_id = str(uuid.uuid4())
        if not transaction_date:
            transaction_date = datetime.utcnow()
        
        # Format transaction date to match the Firestore expectation (ISO string or Timestamp)
        data = {
            "id": expense_id,
            "user_id": user_id,
            "amount": amount,
            "category": category,
            "description": description,
            "title": description or f"Logged expense for {category}",
            "note": description,
            "payment_method": payment_method,
            "transactionDate": transaction_date,
            "transaction_date": transaction_date,
            "type": "expense",
            "source": "ai",
            "agentGenerated": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        set_document(f"users/{user_id}/finance", expense_id, data)
        logger.info(f"Expense {expense_id} successfully created for user {user_id} in users/{user_id}/finance.")
        return data

    @staticmethod
    def update_expense(user_id: str, expense_id: str, updates: dict) -> dict:
        """
        Update specific fields of an expense document.
        """
        from app.firebase import update_document, get_document
        updates["updated_at"] = datetime.utcnow()
        update_document(f"users/{user_id}/finance", expense_id, updates)
        logger.info(f"Expense {expense_id} successfully updated for user {user_id}.")
        return get_document(f"users/{user_id}/finance", expense_id)

    @staticmethod
    def delete_expense(user_id: str, expense_id: str) -> None:
        """
        Delete an expense document.
        """
        from app.firebase import delete_document
        delete_document(f"users/{user_id}/finance", expense_id)
        logger.info(f"Expense {expense_id} successfully deleted for user {user_id}.")
