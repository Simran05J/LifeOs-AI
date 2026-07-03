"""
SessionService — Lightweight in-process conversation session store.

Responsibilities:
- Assign and track session IDs per user conversation.
- Store ordered conversation history as a list of Gemini-compatible turn dicts:
  {"role": "user"|"model", "parts": ["<text>"]}
- Provide create / get / append / delete operations.
- Enforce a configurable TTL so idle sessions are automatically pruned.

Design notes:
- Pure in-process dict — no database dependency.
  Suitable for a single-process FastAPI deployment (capstone scope).
- Thread-safe for asyncio (single-threaded event loop); no additional
  locking is required for async-only access patterns.
- Singleton exposed as `session_service` module-level instance.
"""

import logging
import time
import uuid
from typing import Optional

logger = logging.getLogger(__name__)

# History entry matches the Gemini ChatSession history format exactly.
# {"role": "user" | "model", "parts": ["<text>"]}
HistoryEntry = dict

# Maximum number of turns (user + model pairs) to retain per session.
MAX_HISTORY_TURNS = 20

# Idle TTL in seconds before a session is considered expired (30 minutes).
SESSION_TTL_SECONDS = 1800


class SessionService:
    """
    Encapsulates all session lifecycle operations for chat conversation continuity.

    Storage layout (internal):
        _sessions: dict[session_id, {
            "user_id": str,
            "history": list[HistoryEntry],   # Gemini-compatible turn list
            "created_at": float,              # Unix timestamp
            "last_accessed": float,           # Unix timestamp
        }]
    """

    def __init__(self) -> None:
        self._sessions: dict[str, dict] = {}
        logger.info("SessionService initialised (in-process store, TTL=%ds).", SESSION_TTL_SECONDS)

    # ──────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────

    def create_session(self, user_id: str, session_id: Optional[str] = None) -> str:
        """
        Create a new session for the given user.

        Args:
            user_id:    The authenticated user's ID.
            session_id: Caller-supplied ID (e.g. from the frontend).
                        A UUID is generated when None is passed.

        Returns:
            The session_id that was created.
        """
        sid = session_id or str(uuid.uuid4())
        now = time.monotonic()
        self._sessions[sid] = {
            "user_id": user_id,
            "history": [],
            "created_at": now,
            "last_accessed": now,
        }
        logger.info("Session CREATED  | session_id=%s | user_id=%s", sid, user_id)
        return sid

    def get_history(self, session_id: str) -> list[HistoryEntry]:
        """
        Retrieve the conversation history for the given session.

        Returns an empty list when the session does not exist or has expired
        rather than raising — callers treat a missing session as a fresh start.
        """
        self._prune_expired()

        session = self._sessions.get(session_id)
        if not session:
            logger.debug("Session MISS     | session_id=%s (not found or expired)", session_id)
            return []

        session["last_accessed"] = time.monotonic()
        history = session["history"]
        logger.info(
            "Session HIT      | session_id=%s | history_turns=%d",
            session_id,
            len(history),
        )
        return list(history)  # Return a shallow copy to prevent accidental mutation

    def append_turn(self, session_id: str, user_text: str, model_text: str) -> None:
        """
        Append a completed user↔model exchange to the session history.

        Args:
            session_id:  Target session.
            user_text:   The user's message for this turn.
            model_text:  The AI model's reply for this turn.
        """
        session = self._sessions.get(session_id)
        if not session:
            # Session was pruned between get_history() and append_turn(); recreate it.
            logger.warning(
                "Session ORPHAN   | session_id=%s — re-creating to append turn.", session_id
            )
            self._sessions[session_id] = {
                "user_id": "unknown",
                "history": [],
                "created_at": time.monotonic(),
                "last_accessed": time.monotonic(),
            }
            session = self._sessions[session_id]

        session["history"].append({"role": "user", "parts": [user_text]})
        session["history"].append({"role": "model", "parts": [model_text]})
        session["last_accessed"] = time.monotonic()

        # Trim to MAX_HISTORY_TURNS pairs (keep the most recent)
        max_entries = MAX_HISTORY_TURNS * 2  # Each turn = 2 entries (user + model)
        if len(session["history"]) > max_entries:
            session["history"] = session["history"][-max_entries:]

        logger.info(
            "Session APPEND   | session_id=%s | total_entries=%d",
            session_id,
            len(session["history"]),
        )

    def delete_session(self, session_id: str) -> bool:
        """
        Explicitly remove a session (e.g. on user logout or conversation reset).

        Returns True if the session existed and was removed, False otherwise.
        """
        existed = session_id in self._sessions
        self._sessions.pop(session_id, None)
        if existed:
            logger.info("Session DELETED  | session_id=%s", session_id)
        return existed

    def session_exists(self, session_id: str) -> bool:
        """Return True if the session exists and has not expired."""
        self._prune_expired()
        return session_id in self._sessions

    # ──────────────────────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────────────────────

    def _prune_expired(self) -> None:
        """Remove sessions that have been idle longer than SESSION_TTL_SECONDS."""
        cutoff = time.monotonic() - SESSION_TTL_SECONDS
        expired = [sid for sid, s in self._sessions.items() if s["last_accessed"] < cutoff]
        for sid in expired:
            del self._sessions[sid]
            logger.info("Session EXPIRED  | session_id=%s (TTL exceeded)", sid)


# ── Module-level singleton ────────────────────────────────────────────────────
session_service = SessionService()
