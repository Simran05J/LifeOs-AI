# 05_AGENT_SPECIFICATIONS.md

# LifeOS AI - AI Agent Specifications

Version: 2.0

---

# Purpose

This document defines the responsibilities, inputs, outputs, and limitations of every AI Agent in the LifeOS AI system.

Each AI Agent has only one responsibility.

The Antigravity Orchestrator decides which agent(s) should execute a user request.

---

# Planner Agent

## Responsibility

- Create daily schedules
- Organize tasks
- Suggest productive time blocks

### Input

- User query
- Date
- Existing planner data

### Output

- Daily schedule
- Task priorities
- Time blocks

---

# Reminder Agent

## Responsibility

- Create reminders
- Update reminders
- Delete reminders
- Schedule notifications

### Input

- Reminder details
- Date & Time

### Output

- Reminder confirmation
- Reminder information

---

# Finance Agent

## Responsibility

- Analyze expenses
- Track spending
- Suggest budgets
- Generate financial insights

### Input

- Expense records
- User query

### Output

- Expense summary
- Budget suggestions
- Spending analysis

---

# Travel Agent

## Responsibility

- Plan trips
- Generate itineraries
- Estimate travel budget
- Create packing lists

### Input

- Destination
- Budget
- Duration

### Output

- Travel plan
- Itinerary
- Estimated cost
- Packing list

---

# Wellness Agent

## Responsibility

- Analyze user mood
- Recommend wellness activities
- Suggest healthy routines

### Input

- User message
- Wellness history

### Output

- Mood analysis
- Wellness recommendations
- Daily tips

---

# Antigravity Orchestrator

## Responsibility

- Understand user intent
- Select appropriate AI agent(s)
- Execute one or more agents
- Combine results
- Return a single unified response

The Orchestrator is the only component allowed to communicate with multiple agents.

---

# AI Reasoning Engine

## Responsibility

- Generate AI responses using Gemini
- Handle prompt engineering
- Standardize AI outputs
- Return structured responses

All AI Agents use the AI Reasoning Engine.

Agents never communicate with Gemini directly.

---

# Multi-Agent Collaboration

Example 1

User:

> Plan my tomorrow and remind me to study at 8 PM.

Agents

- Planner
- Reminder

---

Example 2

User:

> Plan a Goa trip under ₹20,000 and manage my travel budget.

Agents

- Travel
- Finance

---

Example 3

User:

> I'm stressed because of exams. Plan my weekend and remind me to meditate every morning.

Agents

- Wellness
- Planner
- Reminder

---

# Agent Rules

- One responsibility per agent.
- Agents never communicate directly.
- Every agent returns the standard API response.
- Only the Orchestrator coordinates multiple agents.
- All AI reasoning goes through the AI Reasoning Engine.

---

# Future Agents

The architecture supports adding new agents such as:

- Email Agent
- OCR Agent
- PDF Agent
- Health Agent
- Shopping Agent
- News Agent

---

# Next Document

06_UI_GUIDELINES.md