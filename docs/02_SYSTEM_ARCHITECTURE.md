# 02_SYSTEM_ARCHITECTURE.md

# LifeOS AI - System Architecture

**Version:** 1.0

---

# 1. Architecture Overview

LifeOS AI follows a modular Multi-Agent Architecture where each component has a single responsibility.

Instead of sending every user request directly to one AI model, the system first analyzes the request, selects the appropriate AI agent(s), gathers their outputs, and then generates a final response for the user.

This architecture allows the application to be scalable, maintainable, and easy to extend with additional agents in the future.

---

# 2. High-Level Architecture

```text
                    User
                      │
          ┌───────────┴───────────┐
          │                       │
      Voice Input            Text Input
          │                       │
          └───────────┬───────────┘
                      │
             Flutter Mobile App
                      │
                REST API (HTTPS)
                      │
               FastAPI Backend
                      │
             Request Validation
                      │
          Antigravity Orchestrator
                      │
      ┌───────────────┼────────────────┐
      │               │                │
 Planner Agent   Reminder Agent   Finance Agent
      │               │                │
 Wellness Agent                 Travel Agent
      │
      └───────────────┬────────────────┘
                      │
              Firebase Services
         (Firestore + Authentication)
                      │
                 Gemini API
                      │
            Standardized Response
                      │
               Flutter Application
                      │
      Text Display + Text-to-Speech
```

---

# 3. System Components

## 3.1 Flutter Frontend

Responsibilities:

* User Authentication
* Chat Interface
* Voice Input
* Voice Output
* Dashboard
* API Communication
* Display AI Responses

The frontend never communicates directly with Gemini or Firebase.

All communication goes through FastAPI.

---

## 3.2 FastAPI Backend

Responsibilities:

* Receive Requests
* Authenticate Users
* Validate Request Data
* Call Antigravity
* Handle Errors
* Return Standard API Responses

The backend acts as the bridge between the mobile application and all AI services.

---

## 3.3 Antigravity Orchestrator

Responsibilities:

* Understand user intent
* Select the correct AI agent
* Execute one or more agents
* Combine outputs
* Return structured results

The orchestrator never contains business logic.

Its only responsibility is routing.

---

# 4. AI Agents

The project contains five specialized agents.

---

## Planner Agent

Responsible for:

* Daily planning
* Scheduling
* Time management
* Productivity plans

---

## Reminder Agent

Responsible for:

* Reminder creation
* Reminder updates
* Reminder deletion
* Notification scheduling

---

## Finance Agent

Responsible for:

* Expense analysis
* Budget suggestions
* Spending summaries
* Financial insights

---

## Wellness Agent

Responsible for:

* Mood tracking
* Wellness suggestions
* Healthy routine recommendations
* Stress management

---

## Travel Agent

Responsible for:

* Trip planning
* Budget estimation
* Itinerary generation
* Packing checklist

---

# 5. Firebase Responsibilities

Firebase is responsible for:

* User Authentication
* Firestore Database
* User Data Storage
* Reminder Storage
* Planner Storage
* Expense Storage
* User Preferences

Firebase is never accessed directly from Flutter.

All reads and writes go through FastAPI.

---

# 6. Gemini Responsibilities

Gemini is used only for AI reasoning.

Examples:

* Planning
* Summarization
* Recommendations
* Natural conversation
* Personalized suggestions

Gemini does not permanently store user information.

---

# 7. Request Lifecycle

Example:

User says:

> "Plan my Goa trip under ₹20,000 and remind me to book train tickets tomorrow."

Flow:

Step 1

Flutter records the user's voice.

↓

Step 2

Speech-to-Text converts voice into text.

↓

Step 3

Flutter sends the request to FastAPI.

↓

Step 4

FastAPI validates the request.

↓

Step 5

Antigravity analyzes the user's intent.

↓

Step 6

The orchestrator detects that two agents are required.

* Travel Agent
* Reminder Agent

↓

Step 7

Travel Agent generates:

* Budget
* Itinerary
* Packing List

↓

Step 8

Reminder Agent creates a reminder.

↓

Step 9

Gemini combines the responses into a natural language reply.

↓

Step 10

FastAPI returns a standardized JSON response.

↓

Step 11

Flutter displays the result.

↓

Step 12

Text-to-Speech reads the response aloud.

---

# 8. Multi-Agent Collaboration

Single-Agent Example

User:

> "How much did I spend this month?"

Only:

Finance Agent

---

Multi-Agent Example

User:

> "Plan my day and remind me to drink water."

Agents Used:

* Planner Agent
* Reminder Agent

---

Advanced Example

User:

> "Plan my Goa trip under ₹20,000 and keep my monthly budget under control."

Agents Used:

* Travel Agent
* Finance Agent

---

Complex Example

User:

> "I'm feeling stressed because of work. Plan my weekend and remind me to go for a walk."

Agents Used:

* Wellness Agent
* Planner Agent
* Reminder Agent

---

# 9. Communication Rules

Every component communicates using REST APIs.

Flutter ↔ FastAPI

JSON

FastAPI ↔ Antigravity

Python Objects

Antigravity ↔ Agents

Python Function Calls

FastAPI ↔ Firebase

Firebase SDK

FastAPI ↔ Gemini

Gemini API

---

# 10. Security Principles

* Firebase Authentication required
* HTTPS communication only
* API keys stored in backend environment variables
* No API keys inside Flutter
* Input validation on every API request
* Standardized error responses

---

# 11. Scalability

Future agents can be added without modifying existing agents.

Example:

* Email Agent
* PDF Agent
* OCR Agent
* Health Agent
* News Agent

The orchestrator only needs to register the new agent.

---

# 12. Design Principles

* Single Responsibility Principle
* Modular Architecture
* Reusable Components
* Loose Coupling
* High Cohesion
* Standardized APIs
* Easy Testing
* AI-Agent Independence

---

# 13. System Advantages

* Modular
* Easy to maintain
* Easy to scale
* Supports multiple AI agents
* Clean separation of responsibilities
* Secure backend architecture
* Cloud deployment ready
* Suitable for production-level expansion

---

# 14. Next Document

**03_API_CONTRACT.md**

This document defines the exact request and response formats that every frontend screen, backend endpoint, and AI agent must follow.
