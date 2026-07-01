# 03_API_CONTRACT.md

# LifeOS AI - API Contract

Version: 2.0

---

# Purpose

This document defines the communication rules between the React Frontend, FastAPI Backend, and AI Layer.

All requests and responses must follow this contract.

No developer or AI-generated code should change this structure without team approval.

---

# Base URL

Development

http://localhost:8000/api/v1

Production

https://your-domain.com/api/v1

---

# Authentication

Every request must include:

Authorization: Bearer <Firebase_ID_Token>

Content-Type: application/json

---

# Main Endpoint

POST

/api/v1/chat

This is the only endpoint used by the frontend.

The frontend never calls individual AI agents directly.

---

# Standard Request Format

```json
{
  "query": "Plan my tomorrow",
  "voice_input": false,
  "user_id": "firebase_uid",
  "session_id": "session_uuid"
}
```

---

# Request Fields

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| query | String | Yes | User message |
| voice_input | Boolean | Yes | Whether input came from voice |
| user_id | String | Yes | Firebase User ID |
| session_id | String | Yes | Chat session ID |

---

# Standard Success Response

```json
{
  "success": true,
  "message": "Request completed successfully.",
  "agents_used": [
    "planner",
    "reminder"
  ],
  "data": {
    "response": "Your schedule has been planned and a reminder has been created."
  },
  "timestamp": "2026-07-01T10:30:00Z"
}
```

---

# Standard Error Response

```json
{
  "success": false,
  "message": "Unable to process request.",
  "error": {
    "code": "INTERNAL_ERROR",
    "details": "Unexpected server error."
  },
  "timestamp": "2026-07-01T10:30:00Z"
}
```

---

# AI Agent Response Format

Every AI Agent must return:

```json
{
  "success": true,
  "agent": "planner",
  "data": {}
}
```

The Orchestrator is responsible for combining multiple agent responses into one final response.

---

# Example 1

User

> Plan my tomorrow.

Agents Used

- Planner Agent

---

Response

```json
{
  "success": true,
  "message": "Schedule created.",
  "agents_used": [
    "planner"
  ],
  "data": {
    "response": "Your schedule for tomorrow has been created."
  }
}
```

---

# Example 2

User

> Plan my Goa trip under ₹20,000 and remind me tomorrow.

Agents Used

- Travel Agent
- Reminder Agent

---

Response

```json
{
  "success": true,
  "message": "Trip planned successfully.",
  "agents_used": [
    "travel",
    "reminder"
  ],
  "data": {
    "response": "Your trip has been planned and a reminder has been created."
  }
}
```

---

# HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

# API Rules

- The frontend communicates only with `/api/v1/chat`.
- AI Agents are never called directly from the frontend.
- Every response must follow the standard JSON structure.
- Every request must be authenticated.
- All timestamps must use ISO 8601 format.

---

# Future APIs

If needed, future endpoints may include:

- /auth
- /profile
- /history
- /settings

The chat endpoint remains the primary interface for all AI interactions.

---

# Next Document

04_DATABASE_SCHEMA.md