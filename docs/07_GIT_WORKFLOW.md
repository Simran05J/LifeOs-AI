# 07_GIT_WORKFLOW.md

# LifeOS AI - Git Workflow

Version: 2.0

---

# Purpose

This document defines how the team will collaborate using Git and GitHub.

Following this workflow ensures that all team members can work independently without breaking the project.

---

# Repository

GitHub Repository

LifeOs-AI

Repository Owner

- Team Lead

Main Branch

```
main
```

The `main` branch should always contain stable and working code.

---

# Team Responsibilities

## Member 1 – Frontend

Responsible for:

- React
- Vite
- Dashboard
- Chat UI
- Voice Features
- API Integration

---

## Member 2 – Backend

Responsible for:

- FastAPI
- Firebase
- Authentication
- API Development
- Database

---

## Member 3 – AI Layer

Responsible for:

- Antigravity
- Orchestrator
- Planner Agent
- Reminder Agent
- Finance Agent
- Travel Agent
- Wellness Agent
- AI Core (Gemini)

---

# Initial Setup

Every team member should:

Clone the repository

```
git clone https://github.com/Simran05J/LifeOs-AI.git
```

Open the project

```
cd LifeOs-AI

code .
```

---

# Branches

Each team member creates their own branch.

Frontend Developer

```
git checkout -b frontend
```

Backend Developer

```
git checkout -b backend
```

AI Developer

```
git checkout -b ai
```

Push the branch once

Example

```
git push -u origin ai
```

---

# Daily Workflow

Before starting work

```
git checkout <your_branch>

git pull origin main
```

Example

```
git checkout ai

git pull origin main
```

---

Work on your assigned module.

Never modify another teammate's files without discussion.

---

After completing work

```
git add .

git commit -m "Meaningful commit message"

git push origin <your_branch>
```

Example

```
git add .

git commit -m "Implemented Planner Agent"

git push origin ai
```

---

# Pull Request Workflow

When a feature is complete:

1. Push your branch.
2. Open GitHub.
3. Create a Pull Request.
4. Another teammate reviews the code.
5. Merge into `main`.

Only reviewed code should be merged.

---

# After a Merge

Every team member should update their local project.

```
git checkout main

git pull origin main
```

Then switch back to their own branch.

Example

```
git checkout ai
```

---

# Commit Message Format

Use meaningful commit messages.

Examples

```
feat: Added planner agent

feat: Implemented login screen

fix: Fixed authentication bug

refactor: Improved orchestrator

docs: Updated API contract

style: Updated dashboard UI
```

---

# Project Rules

Always:

- Pull before starting work.
- Push only to your own branch.
- Test your code before pushing.
- Follow the API Contract.
- Follow the project documentation.

Never:

- Push directly to `main`.
- Delete another member's code.
- Change folder structure without discussion.
- Rename APIs or database collections.
- Ignore merge conflicts.

---

# Merge Conflict Rule

If a merge conflict occurs:

1. Stop working.
2. Inform the team.
3. Resolve the conflict together.
4. Test the project.
5. Push the resolved code.

Never force push to overwrite someone else's work.

---

# Development Workflow

```
Planning
      │
      ▼
Documentation
      │
      ▼
Development
      │
      ▼
Testing
      │
      ▼
Pull Request
      │
      ▼
Code Review
      │
      ▼
Merge
      │
      ▼
Deployment
```

---

# Goal

Maintain a clean, organized, and collaborative development workflow where all three team members can work simultaneously without breaking the project.