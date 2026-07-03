import os
import sys
from datetime import datetime

# Set python path to backend directory
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from unittest.mock import AsyncMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Mock the environment variables for Settings before importing app
os.environ["GEMINI_API_KEY"] = "mock-api-key"
os.environ["FIREBASE_PROJECT_ID"] = "mock-project"

from main import app
from app.core.security import get_current_user
from app.schemas.user import AuthUser
from app.ai.gemini_client import GeminiClient

# Define mock current user dependency to bypass Firebase verify token
async def mock_get_current_user() -> AuthUser:
    return AuthUser(
        uid="mock-user-123",
        email="mockuser@example.com",
        name="Mock User",
        picture=None,
        email_verified=True
    )

# Override the authentication dependency
app.dependency_overrides[get_current_user] = mock_get_current_user

def test_chat_integration():
    client = TestClient(app)
    
    # Mock GeminiClient.generate to return a successful deterministic response
    mock_response = (
        "{\n"
        '  "success": true,\n'
        '  "destination": "Goa",\n'
        '  "itinerary": [],\n'
        '  "estimated_budget": {"accommodation": 0.0, "food": 0.0, "transport": 0.0, "activities": 0.0, "miscellaneous": 0.0, "total": 0.0},\n'
        '  "packing_list": [],\n'
        '  "travel_tips": [],\n'
        '  "summary": "Mock travel plan successfully created!"\n'
        "}"
    )
    
    with patch.object(GeminiClient, "generate", new_callable=AsyncMock) as mock_generate:
        mock_generate.return_value = mock_response
        
        # Test query that will route to TravelAgent ("Goa" keywords)
        request_body = {
            "message": "Plan a Goa trip",
            "session_id": "test-session-123"
        }
        
        print("Sending POST /api/v1/chat request...")
        response = client.post("/api/v1/chat/", json=request_body)
        
        print(f"Response status code: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        # Assertions
        assert response.status_code == 200
        json_data = response.json()
        assert json_data["success"] is True
        assert json_data["message"] == "Chat message processed successfully"
        assert json_data["data"]["session_id"] == "test-session-123"
        assert "Mock travel plan successfully created!" in json_data["data"]["message"]
        
        print("\nIntegration Test Passed Successfully!")

if __name__ == "__main__":
    try:
        test_chat_integration()
    except Exception as e:
        print(f"Test failed with error: {e}", file=sys.stderr)
        sys.exit(1)
