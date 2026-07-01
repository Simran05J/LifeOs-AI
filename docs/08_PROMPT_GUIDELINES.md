# 08_PROMPT_GUIDELINES.md

# LifeOS AI - Prompt Guidelines

Version: 2.0

---

# Purpose

This document defines how every team member should prompt Antigravity while generating code.

The goal is to ensure that all generated code follows the same architecture, coding standards, and project rules.

---

# Before Every Prompt

Always instruct Antigravity to read:

- 00_MASTER_PROMPT.md
- 01_PROJECT_REQUIREMENTS.md
- 02_SYSTEM_ARCHITECTURE.md
- 03_API_CONTRACT.md
- 04_DATABASE_SCHEMA.md
- 05_AGENT_SPECIFICATIONS.md
- 06_UI_GUIDELINES.md
- 07_GIT_WORKFLOW.md
- 09_IMPLEMENTATION_PLAN.md

---

# General Rules

Always:

- Follow project architecture.
- Follow API Contract.
- Follow folder structure.
- Generate modular code.
- Generate production-ready code.
- Keep code reusable.
- Handle errors properly.

Never:

- Change folder structure.
- Rename files.
- Rename API endpoints.
- Change JSON formats.
- Generate unnecessary files.
- Modify another teammate's module.

---

# Frontend Prompt Rules

Scope

Only work inside:

```
frontend/
```

Allowed Tasks

- React Components
- Pages
- Styling
- API Integration
- Voice UI

Never

- Create backend APIs.
- Modify Firebase.
- Implement AI logic.

---

# Backend Prompt Rules

Scope

Only work inside:

```
backend/
```

Allowed Tasks

- FastAPI
- Authentication
- Firebase
- API Endpoints
- Validation

Never

- Modify frontend.
- Implement AI Agent logic.

---

# AI Prompt Rules

Scope

Only work inside:

```
backend/app/agents/
backend/app/ai/
```

Allowed Tasks

- Antigravity Orchestrator
- Planner Agent
- Reminder Agent
- Finance Agent
- Wellness Agent
- Travel Agent
- AI Core

Never

- Modify frontend.
- Modify API routes.
- Change Firebase structure.

---

# Prompt Template

Use this template before generating code.

--------------------------------------------------

Read the project documentation.

Follow all architecture, API contracts, and coding rules.

Work only on the requested module.

Do not modify unrelated files.

Generate production-ready code.

Explain where each file belongs.

--------------------------------------------------

---

# Review Checklist

Before accepting generated code, verify:

- Folder structure is correct.
- API Contract is followed.
- No unnecessary files are created.
- Naming conventions are respected.
- Code is modular.
- Code compiles successfully.

---

# Team Rule

One prompt = One feature.

Never ask Antigravity to generate the entire project.

Always implement one phase from:

09_IMPLEMENTATION_PLAN.md

---

# Goal

Generate clean, maintainable, and compatible code while ensuring all team members can work independently without breaking the project.