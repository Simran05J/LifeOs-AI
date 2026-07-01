# 04_DATABASE_SCHEMA.md

# LifeOS AI - Database Schema

Version: 2.0

---

# Purpose

This document defines the Firestore database structure used in the LifeOS AI project.

The database is user-centric, meaning every authenticated user has their own data stored securely.

---

# Database Structure

Firestore

```
users/
    └── {userId}/
            ├── profile/
            ├── planner/
            ├── reminders/
            ├── expenses/
            ├── trips/
            ├── wellness/
            └── chat_sessions/
```

---

# Authentication

Firebase Authentication

Stores:

- User ID
- Email
- Display Name
- Profile Photo

Every Firestore document belongs to an authenticated user.

---

# users Collection

Path

```
users/{userId}
```

Fields

| Field | Type |
|--------|------|
| full_name | String |
| email | String |
| photo_url | String |
| language | String |
| voice_enabled | Boolean |
| created_at | Timestamp |

---

# planner Collection

Path

```
users/{userId}/planner/{planId}
```

Fields

| Field | Type |
|--------|------|
| title | String |
| description | String |
| start_time | Timestamp |
| end_time | Timestamp |
| priority | String |
| status | String |

---

# reminders Collection

Path

```
users/{userId}/reminders/{reminderId}
```

Fields

| Field | Type |
|--------|------|
| title | String |
| reminder_time | Timestamp |
| repeat | String |
| completed | Boolean |

---

# expenses Collection

Path

```
users/{userId}/expenses/{expenseId}
```

Fields

| Field | Type |
|--------|------|
| amount | Number |
| category | String |
| description | String |
| payment_method | String |
| transaction_date | Timestamp |

---

# trips Collection

Path

```
users/{userId}/trips/{tripId}
```

Fields

| Field | Type |
|--------|------|
| destination | String |
| budget | Number |
| start_date | Timestamp |
| end_date | Timestamp |
| itinerary | Array |
| packing_list | Array |

---

# wellness Collection

Path

```
users/{userId}/wellness/{wellnessId}
```

Fields

| Field | Type |
|--------|------|
| mood | String |
| stress_level | String |
| recommendations | Array |
| created_at | Timestamp |

---

# chat_sessions Collection

Path

```
users/{userId}/chat_sessions/{sessionId}
```

Fields

| Field | Type |
|--------|------|
| title | String |
| started_at | Timestamp |
| last_message | String |
| updated_at | Timestamp |

---

# messages Subcollection

Path

```
users/{userId}/chat_sessions/{sessionId}/messages/{messageId}
```

Fields

| Field | Type |
|--------|------|
| sender | String |
| message | String |
| timestamp | Timestamp |
| agents_used | Array |

---

# Security Rules

- Firebase Authentication is required.
- Users can access only their own data.
- Firestore rules must prevent unauthorized access.
- API keys are never stored in Firestore.

---

# Future Collections

Possible future additions:

- documents
- notifications
- habits
- emails
- OCR history
- AI memory

---

# Database Rules

- Every collection belongs to a user.
- Never duplicate user data.
- Use timestamps for created and updated records.
- Follow the defined schema.
- Do not change collection names without updating the documentation.

---

# Next Document

05_AGENT_SPECIFICATIONS.md