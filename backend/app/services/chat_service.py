import logging
import re
import uuid
from datetime import datetime
from app.schemas.chat import ChatRequest, ChatResponse
from app.orchestrator.orchestrator import AntigravityOrchestrator
from app.agents.shared.models import AgentRequest, AgentResponse
from app.agents.shared.exceptions import AgentValidationError, AgentExecutionError
from app.services.session_service import session_service

logger = logging.getLogger(__name__)

# Instantiate the AntigravityOrchestrator singleton
orchestrator = AntigravityOrchestrator()


# ---------------------------------------------------------------------------
# Payload extraction helpers
# ---------------------------------------------------------------------------

_BUDGET_RE = re.compile(
    r"""(?:under|within|budget|of|for|with|around)?\s*
        (?:rs\.?|inr|₹|\$|usd)?\s*
        ([\d,]+(?:\.\d{1,2})?)\s*
        (?:rs\.?|inr|₹|\$|usd|thousand|k|lakh|lac)?\s*
        (?:rupees?|dollars?)?\b""",
    re.IGNORECASE | re.VERBOSE,
)

# Common destination keywords to extract from travel messages
_KNOWN_DESTINATIONS = [
    "goa", "delhi", "mumbai", "bangalore", "bengaluru", "hyderabad",
    "chennai", "kolkata", "jaipur", "agra", "kerala", "manali",
    "shimla", "rishikesh", "varanasi", "pune", "ahmedabad",
    "paris", "london", "dubai", "singapore", "bangkok", "new york",
    "tokyo", "bali", "sydney", "rome", "barcelona", "amsterdam",
]


def _extract_destination(message: str) -> str:
    """Return the first recognizable destination found in the message, else 'Not specified'."""
    lower = message.lower()
    for dest in _KNOWN_DESTINATIONS:
        if dest in lower:
            # Return title-cased canonical name
            return dest.title()
    # Fallback: look for pattern like 'to <City>' or 'in <City>'
    match = re.search(r"\b(?:to|in|visit|visiting|for|at)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)", message)
    if match:
        return match.group(1)
    return "Not specified"


def _extract_budget(message: str) -> float:
    """Return the first numeric budget found in the message, else 20000.0 as default."""
    match = _BUDGET_RE.search(message)
    if match:
        raw = match.group(1).replace(",", "")
        try:
            value = float(raw)
            # Handle shorthand like '20k' → 20000
            lower = message.lower()
            if re.search(r"\b" + re.escape(raw.split(".")[0]) + r"\s*(?:k|thousand)\b", lower):
                value *= 1000
            elif re.search(r"\b" + re.escape(raw.split(".")[0]) + r"\s*(?:lakh|lac)\b", lower):
                value *= 100_000
            return max(value, 1.0)  # must be positive
        except ValueError:
            pass
    return 20_000.0  # sensible default


class ChatService:
    @staticmethod
    async def process_chat_message(request: ChatRequest, user_id: str) -> ChatResponse:
        """
        Accepts user chat messages, maps them to an AgentRequest,
        forwards them to the AntigravityOrchestrator, and returns the response mapped to ChatResponse.

        Session continuity:
          1. If a session_id is supplied and known, its conversation history is retrieved
             from SessionService and injected into the agent payload.
          2. If no session_id is supplied (or the session has expired), a fresh session is
             created and the conversation starts clean.
          3. After a successful response, the user↔model turn is persisted back to the session
             so subsequent requests carry the full accumulated context.
        """
        logger.info("Processing chat message for user_id: %s", user_id)
        logger.debug(
            "Message content: '%s' | Incoming session_id: %s",
            request.message,
            request.session_id,
        )

        # ── Step 1: Resolve session ───────────────────────────────────────────
        incoming_sid = request.session_id

        if incoming_sid and session_service.session_exists(incoming_sid):
            # Existing session — retrieve accumulated history
            session_id = incoming_sid
            conversation_history = session_service.get_history(session_id)
            logger.info(
                "Session RESUMED  | session_id=%s | history_turns=%d",
                session_id,
                len(conversation_history),
            )
        else:
            # New session (or expired) — create fresh
            if incoming_sid:
                logger.info(
                    "Session EXPIRED/UNKNOWN | incoming session_id=%s — creating new session.",
                    incoming_sid,
                )
            session_id = session_service.create_session(
                user_id=user_id,
                session_id=incoming_sid,  # Reuse caller-supplied ID if provided
            )
            conversation_history = []
            logger.info("Session NEW      | session_id=%s | user_id=%s", session_id, user_id)

        # ── Step 2: Build AgentRequest ────────────────────────────────────────
        current_time = datetime.utcnow()
        today = current_time.date()

        agent_request = AgentRequest(
            user_id=user_id,
            agent="chat",
            payload={
                "query": request.message,
                "user_message": request.message,
                "session_id": session_id,
                "conversation_history": conversation_history,   # ← injected for agents
                "current_time": current_time,
                "target_date": today,
                "start_date": today,
                "end_date": today,
                # Extract travel parameters from the actual message instead of hardcoding
                "destination": _extract_destination(request.message),
                "budget": _extract_budget(request.message),
                "expense_records": [],
                "existing_tasks": [],
            },
        )

        # ── Step 3: Execute via Orchestrator ──────────────────────────────────
        try:
            logger.info("Forwarding request to the Antigravity Orchestrator...")
            agent_response: AgentResponse = await orchestrator.execute(agent_request)

            # Map AgentResponse back to ChatResponse: extract the detailed summary if available,
            # otherwise fall back to the outer agent message.
            response_text = None
            if agent_response.data:
                if "summary" in agent_response.data:
                    response_text = agent_response.data["summary"]
                elif "responses" in agent_response.data and isinstance(
                    agent_response.data["responses"], list
                ):
                    summaries = []
                    for resp in agent_response.data["responses"]:
                        if isinstance(resp, dict) and "summary" in resp:
                            summaries.append(resp["summary"])
                    if summaries:
                        response_text = " | ".join(summaries)

            if not response_text:
                response_text = agent_response.message or "Request processed successfully."

            logger.info("Successfully received response from Antigravity Orchestrator.")

            # ── Step 4: Persist turn to session ──────────────────────────────
            session_service.append_turn(
                session_id=session_id,
                user_text=request.message,
                model_text=response_text,
            )
            logger.info(
                "Session SAVED    | session_id=%s | turn appended successfully.", session_id
            )

            return ChatResponse(
                message=response_text,
                session_id=session_id,
                response_id=str(uuid.uuid4()),
                created_at=datetime.utcnow(),
            )

        except AgentValidationError as exc:
            logger.warning(
                "Agent validation error while processing chat message for user %s: %s",
                user_id,
                exc,
            )
            raise
        except AgentExecutionError as exc:
            logger.error(
                "Agent execution error while processing chat message for user %s: %s",
                user_id,
                exc,
                exc_info=True,
            )
            raise
        except Exception as exc:
            logger.error(
                "Unexpected error in ChatService for user %s: %s", user_id, exc, exc_info=True
            )
            raise AgentExecutionError(f"Unexpected chat service error: {exc}") from exc
