# Production-Grade Chat Session Architecture Checklist

- `[x]` Part 1: Core Chat Session Architecture (Backend & Frontend Foundations)
  - `[x]` Fix keyword substring matching bug (e.g. "goa" matching "goal") in orchestrator using word boundary regex
  - `[x]` Add missing wellness keywords (water, litres, drink, track, goal, fitness, etc.) to orchestrator
  - `[x]` Add `session_title` to `ChatResponse` schema and implement AI title generation on first turn in `chat_service.py`
  - `[x]` Enable Firestore chat session recovery when in-process memory cache misses (e.g. on server restart)
  - `[x]` Enable "Rename" option in frontend `ConversationItem.jsx` dropdown and pass handler
  - `[x]` Implement `handleRenameConv` in `Dashboard.jsx` to update session title in Firestore and local state
- `[ ]` Part 2: Session Context Memory Refinements
- `[ ]` Part 3: Robust Error Handling & Verification
