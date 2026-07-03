# 10_TEAM_RESPONSIBILITIES.md

# LifeOS AI - Team Responsibilities

Version: 1.0

---

# Purpose

This document defines the responsibilities, boundaries, and collaboration rules for every team member.

Its purpose is to ensure that multiple developers can work simultaneously without breaking the project.

Every team member must follow this document before generating or modifying code.

---

# Team Members

## Member 1

Role

Frontend Developer

---

## Member 2

Role

Backend Developer

---

## Member 3

Role

AI Engineer

---

# Common Rules

Every team member must:

- Read all project documentation before starting work.
- Follow the project architecture.
- Follow the API Contract.
- Follow the database schema.
- Work only inside their assigned folders.
- Test their work before committing.
- Push only working code.
- Never modify another member's code without discussion.

---

# Folder Ownership

## Frontend Developer

Owns:

```
frontend/
```

Can Modify

- Components
- Pages
- Layouts
- Styles
- Hooks
- Context
- API Services

Cannot Modify

- backend/
- docs/
- Firebase Schema
- AI Agents

---

## Backend Developer

Owns

```
backend/app/api/
backend/app/firebase/
backend/app/models/
backend/app/schemas/
backend/app/services/
```

Can Modify

- FastAPI
- Authentication
- Firebase
- APIs
- Validation
- Database Operations

Cannot Modify

- frontend/
- AI Agents
- Orchestrator
- Gemini Prompts

---

## AI Engineer

Owns

```
backend/app/agents/

backend/app/ai/
```

Can Modify

- Antigravity Orchestrator
- AI Core
- Planner Agent
- Reminder Agent
- Finance Agent
- Travel Agent
- Wellness Agent
- Prompt Engineering

Cannot Modify

- React
- FastAPI APIs
- Firebase Collections
- UI Components

---

# Responsibilities

## Frontend Developer

Responsible For

- React Setup
- UI Components
- Dashboard
- Chat Screen
- Voice Interface
- API Integration
- Displaying AI Responses

Frontend communicates only with:

```
POST /api/v1/chat
```

---

## Backend Developer

Responsible For

- FastAPI
- Authentication
- Firebase
- Validation
- API Endpoints
- Database

Backend communicates with:

- Frontend
- AI Layer
- Firebase

Backend does NOT make AI decisions.

---

## AI Engineer

Responsible For

- Intent Detection
- Orchestrator
- Multi-Agent Collaboration
- AI Core
- Gemini Integration
- AI Agents

The AI Layer is responsible for all AI reasoning.

---

# Integration Rules

Every feature must follow this flow:

```
User

↓

Frontend

↓

Backend

↓

AI Layer

↓

Gemini

↓

Backend

↓

Frontend
```

No component may bypass another.

---

# API Rules

Frontend must never change request format.

Backend must never change response format.

AI must always return standardized outputs.

The API Contract is the single source of truth.

---

# Database Rules

Only Backend interacts with Firebase.

Frontend never accesses Firestore.

AI never writes directly to Firebase.

---

# AI Rules

Every AI Agent has one responsibility.

Agents never communicate directly.

Only the Orchestrator coordinates multiple agents.

Every AI response passes through the AI Core.

---

# Daily Workflow

Before starting work

1. Pull latest changes

```
git checkout <your_branch>

git pull origin main
```

2. Review assigned task.

3. Generate code using Antigravity.

4. Test locally.

5. Commit changes.

6. Push your branch.

---

# Before Creating an Antigravity Prompt

Every team member must instruct Antigravity to read:

- 00_MASTER_PROMPT.md
- 01_PROJECT_REQUIREMENTS.md
- 02_SYSTEM_ARCHITECTURE.md
- 03_API_CONTRACT.md
- 04_DATABASE_SCHEMA.md
- 05_AGENT_SPECIFICATIONS.md
- 06_UI_GUIDELINES.md
- 07_GIT_WORKFLOW.md
- 08_PROMPT_GUIDELINES.md
- 09_IMPLEMENTATION_PLAN.md
- 10_TEAM_RESPONSIBILITIES.md

---

# Code Review Checklist

Before creating a Pull Request, verify:

- Project builds successfully.
- Folder structure is unchanged.
- API Contract is followed.
- Database schema is unchanged.
- No unrelated files are modified.
- Code is documented where necessary.
- No hardcoded secrets exist.

---

# Communication Rules

Before changing:

- API Contract
- Database Schema
- Folder Structure
- Shared Models

The team must discuss and approve the change.

---

# Project Goal

Work as one engineering team while keeping responsibilities clearly separated.

Every module should integrate smoothly without requiring major refactoring.