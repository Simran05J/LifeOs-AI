import os
import sys

# Set python path to backend directory
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from unittest.mock import AsyncMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Mock settings
os.environ["GEMINI_API_KEY"] = "mock-api-key"
os.environ["FIREBASE_PROJECT_ID"] = "mock-project"

from main import app
from app.core.security import get_current_user
from app.schemas.user import AuthUser
from app.services.chat_service import ChatService

# Mock user
async def mock_get_current_user() -> AuthUser:
    return AuthUser(
        uid="user-123",
        email="user123@example.com",
        name="Mock User",
        picture=None,
        email_verified=True
    )

app.dependency_overrides[get_current_user] = mock_get_current_user

def test_delete_chat_success():
    client = TestClient(app)
    
    with patch.object(ChatService, "delete_chat_session", new_callable=AsyncMock) as mock_delete:
        mock_delete.return_value = None
        
        response = client.delete("/api/v1/chat/session-abc")
        
        assert response.status_code == 200
        json_data = response.json()
        assert json_data["success"] is True
        assert json_data["message"] == "Conversation deleted successfully"
        mock_delete.assert_called_once_with(session_id="session-abc", user_id="user-123")
        print("DELETE success test passed.")

def test_delete_chat_forbidden():
    client = TestClient(app)
    
    with patch.object(ChatService, "delete_chat_session", new_callable=AsyncMock) as mock_delete:
        mock_delete.side_effect = PermissionError("Access denied: You do not own this conversation.")
        
        response = client.delete("/api/v1/chat/session-xyz")
        
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]
        print("DELETE forbidden test passed.")

def test_delete_chat_not_found():
    client = TestClient(app)
    
    with patch.object(ChatService, "delete_chat_session", new_callable=AsyncMock) as mock_delete:
        mock_delete.side_effect = ValueError("Conversation not found")
        
        response = client.delete("/api/v1/chat/session-nonexistent")
        
        assert response.status_code == 404
        assert "Conversation not found" in response.json()["detail"]
        print("DELETE not found test passed.")

if __name__ == "__main__":
    test_delete_chat_success()
    test_delete_chat_forbidden()
    test_delete_chat_not_found()
    print("\nAll Delete Chat Backend Tests Passed!")
