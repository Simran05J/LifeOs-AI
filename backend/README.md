# AI Life OS Backend

This repository contains the production-ready FastAPI backend for the AI Life OS Capstone Project. It is designed with a decoupled modular architecture, structured service layers, robust request logging, IP rate limiting, OWASP-compliant security headers, and safe singleton Firebase Admin SDK integration.

---

## Folder Structure

The project follows a standard modular FastAPI structure:

```text
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py         # Authentication placeholders
│   │       │   ├── chat.py         # Chat communication route
│   │       │   ├── profile.py      # Profile retrieval & updates
│   │       │   ├── reminders.py    # Reminders CRUD endpoints
│   │       │   ├── settings.py     # User settings management
│   │       │   └── tasks.py        # Tasks CRUD endpoints
│   │       └── router.py           # V1 central router registry
│   ├── core/
│   │   ├── config.py               # Pydantic Settings management
│   │   ├── exceptions.py           # Global JSON exception formatters
│   │   ├── middleware.py           # Request tracking, Security headers, Rate limiter
│   │   └── security.py             # Firebase Token Verification & Auth dependencies
│   ├── firebase/
│   │   ├── firebase.py             # Central singleton Firebase initializer & DB helper APIs
│   │   └── client.py               # Singleton client delegation module
│   ├── models/                     # Database/data model packages
│   ├── schemas/                    # Pydantic v2 validation models
│   │   ├── chat.py
│   │   ├── common.py               # success, error, pagination containers
│   │   ├── profile.py
│   │   ├── reminder.py
│   │   ├── settings.py
│   │   ├── task.py
│   │   └── user.py
│   ├── services/                   # Business logic layer classes
│   │   ├── chat_service.py         # Mock/stub interface forwarding to AI orchestrator
│   │   ├── profile_service.py      # Profile management logic
│   │   ├── reminder_service.py     # Reminders CRUD with ownership check
│   │   ├── settings_service.py     # User preferences configurations
│   │   └── task_service.py         # Tasks CRUD with status filters
│   └── utils/                      # Helper & general formatting functions
├── .env.example                    # Sample environment configurations
├── config.py                       # Global settings re-export file
├── main.py                         # Application entrypoint & lifespan manager
└── requirements.txt                # External library dependencies
```

---

## Requirements

- **Python**: `>=3.10`
- **Database / Auth Provider**: Firebase / Firestore

Dependencies are managed in [requirements.txt](file:///c:/Users/HP/OneDrive/Desktop/backend/requirements.txt):
- `fastapi`
- `uvicorn[standard]`
- `pydantic[email]`
- `pydantic-settings`
- `python-dotenv`
- `firebase-admin`
- `python-multipart`

---

## Installation

1. Clone the repository and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```

3. Activate the virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     source .venv/bin/activate
     ```

4. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## Environment Variables

Create a `.env` file in the root backend directory by copying the `.env.example` file:
```bash
cp .env.example .env
```

| Key | Default | Description |
| :--- | :--- | :--- |
| `PROJECT_NAME` | `"AI Life OS Backend"` | Name of the project displayed in Swagger docs. |
| `APP_ENV` | `"development"` | Application environment (`development`, `staging`, `production`). |
| `DEBUG` | `True` | Runs FastAPI app with debug logs and interactive tools. |
| `API_V1_STR` | `"/api/v1"` | Base prefix for version 1 API endpoints. |
| `SECRET_KEY` | `""` | Key used for optional JWT token signing. |
| `BACKEND_CORS_ORIGINS` | `["*"]` | List of allowed CORS origins (formatted as a JSON array). |
| `RATE_LIMIT_PER_MINUTE` | `120` | Maximum request count per IP in a moving 60-second window. |
| `FIREBASE_CREDENTIALS_PATH` | `""` | File path to your service account credential JSON file. |
| `FIREBASE_CREDENTIALS_JSON` | `""` | Raw JSON string representing your Firebase service account key. |
| `FIREBASE_DATABASE_URL` | `""` | Database URL for your Firebase project instance. |

---

## Firebase Setup

To authenticate requests and communicate with Firestore, the Admin SDK requires authentication credentials:

1. **Service Account Key File**:
   - Go to the Firebase Console -> Project Settings -> Service Accounts.
   - Click **Generate new private key** and download the JSON file.
   - Place this file in `app/firebase/firebase_credentials.json` (or set `FIREBASE_CREDENTIALS_PATH` in your `.env` pointing to it).

2. **JSON Environment Variable (Production Best Practice)**:
   - In environments where storing file keys is difficult, copy the raw content of your downloaded key JSON and set it as `FIREBASE_CREDENTIALS_JSON` in your `.env`.

---

## Running FastAPI

Start the backend server locally using Uvicorn:
```bash
python main.py
```
Alternatively, run it directly via the shell:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The server will start at `http://localhost:8000`.

---

## API Documentation

FastAPI automatically generates interactive Swagger and Redoc documentation on startup:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc UI**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## API Endpoints

All custom routes require bearer authorization (`Authorization: Bearer <Firebase_ID_Token>`).

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server status and Firestore connectivity check (Public). |
| `POST` | `/api/v1/chat` | Send a query to the chat processor. |
| `GET` | `/api/v1/profile` | Retrieve the authenticated user's profile. |
| `POST` | `/api/v1/profile` | Create the authenticated user's profile. |
| `PUT` | `/api/v1/profile` | Update the authenticated user's profile. |
| `GET` | `/api/v1/reminders` | List all reminders owned by the user. |
| `POST` | `/api/v1/reminders` | Create a new reminder. |
| `PUT` | `/api/v1/reminders/{id}`| Update specific fields of a reminder. |
| `DELETE`| `/api/v1/reminders/{id}`| Delete a specific reminder. |
| `GET` | `/api/v1/tasks` | List user tasks (supports `?status=todo` filtering). |
| `POST` | `/api/v1/tasks` | Create a new task. |
| `PUT` | `/api/v1/tasks/{id}` | Update specific fields of a task. |
| `DELETE`| `/api/v1/tasks/{id}` | Delete a specific task. |
| `GET` | `/api/v1/settings` | Retrieve user preferences. |
| `PUT` | `/api/v1/settings` | Update user preferences. |

### Standard Response Envelope
All API endpoints return responses in a standardized format:

**Success Response (HTTP 200/201)**:
```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": [
    {
      "id": "e2a1b9c8-d7f6-4a3b-2c1d-0e9f8a7b6c5d",
      "title": "Complete Capstone Backend",
      "description": "Establish FastAPI structure and Firebase services",
      "due_date": "2026-07-15T23:59:59",
      "priority": "high",
      "status": "todo",
      "tags": ["backend", "capstone"]
    }
  ]
}
```

**Error Response (HTTP 4xx/500)**:
```json
{
  "success": false,
  "error": "validation_error",
  "detail": {
    "message": "The request body or parameters failed validation.",
    "errors": [
      {
        "field": "body -> remind_at",
        "message": "field required",
        "type": "missing"
      }
    ]
  }
}
```

---

## Integration Guide for Frontend Team

1. **Authentication**:
   - The frontend is responsible for using the Firebase Client SDK to authenticate the user and retrieve the ID token (`user.getIdToken()`).
   - Attach this token to the header of all HTTP requests:
     ```http
     Authorization: Bearer <Firebase_ID_Token>
     ```

2. **CORS Handling**:
   - If hosting the frontend on a specific origin (e.g. `http://localhost:3000`), update the backend's `.env` configuration file to allow that domain:
     ```env
     BACKEND_CORS_ORIGINS=["http://localhost:3000"]
     ```

3. **Error Handling**:
   - HTTP Status `401 Unauthorized` indicates that the ID token is missing, expired, or invalid. The frontend should capture this and prompt the user to re-authenticate or refresh their Firebase session.
   - HTTP Status `429 Too Many Requests` indicates that the rate limiter is active. Ensure your request loops have appropriate backoffs.

---

## Integration Guide for AI Team

1. **Decoupled AI Hook Interface**:
   - The AI logic should reside in `/backend/app/ai` or the specified orchestrator layer.
   - The endpoint `/api/v1/chat` is hooked to `ChatService.process_chat_message` inside [app/services/chat_service.py](file:///c:/Users/HP/OneDrive/Desktop/backend/app/services/chat_service.py).
   - Once the AI Orchestrator is ready, import its module inside `chat_service.py` and replace the placeholder response generation with calls to your orchestrator logic.

2. **Accessing Context Data**:
   - To build prompts with context, the AI orchestrator can access user data using the service layer modules:
     ```python
     from app.services.profile_service import ProfileService
     from app.services.task_service import TaskService
     from app.services.reminder_service import ReminderService

     profile = await ProfileService.get_profile(user_id)
     tasks = await TaskService.list_tasks(user_id)
     reminders = await ReminderService.list_reminders(user_id)
     ```
   - These service functions handle user validation and fetch data securely using the Firestore client.

---

## Troubleshooting

- **Firebase credentials error warning on startup**:
  - If you see `Firebase credentials not found or invalid. Firebase services might be unavailable.`, ensure that either `FIREBASE_CREDENTIALS_PATH` points to a valid file, or `FIREBASE_CREDENTIALS_JSON` contains valid raw credential keys.
- **Port 8000 in use**:
  - If another process is using port 8000, you can run the server on a different port:
    ```bash
    uvicorn main:app --port 8080 --reload
    ```
- **Unprocessable Entity (422) on requests**:
  - Check the `detail` object in the JSON error response to find which field failed validation. Ensure your request format matches the expected Pydantic model structure exactly.
