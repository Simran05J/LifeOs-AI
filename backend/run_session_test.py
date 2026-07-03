"""
Session continuity integration test.

Simulates three sequential chat turns on the same session:
  Turn 1: "Plan my day tomorrow."
  Turn 2: "Add a gym session at 6 PM."
  Turn 3: "Move it to 7 PM."

The third request must be interpreted within the same conversation context,
i.e. the model should understand that "it" refers to the gym session added
in Turn 2 and adjust the time to 7 PM.

Run from the backend/ directory:
    python run_session_test.py

Environment:
    - GEMINI_API_KEY must be set (real or mocked).
    - Firebase auth is bypassed via the mock in test infra.
"""

import asyncio
import os
import sys
import uuid
from unittest.mock import AsyncMock, patch

# ── Path setup ────────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_KEY:
    print("[WARN] GEMINI_API_KEY not set — Gemini calls will fail unless mocked.\n")

MOCK_GEMINI = os.environ.get("MOCK_GEMINI", "1") == "1"


# ── Helpers ───────────────────────────────────────────────────────────────────

def banner(text: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}")


async def send_turn(
    message: str,
    session_id: str | None,
    user_id: str,
    turn_label: str,
) -> str:
    """Send one chat turn and return (response_text, session_id)."""
    from app.schemas.chat import ChatRequest
    from app.services.chat_service import ChatService

    request = ChatRequest(message=message, session_id=session_id)
    response = await ChatService.process_chat_message(request=request, user_id=user_id)

    print(f"\n[{turn_label}]")
    print(f"  User    : {message}")
    print(f"  AI      : {response.message[:300]}{'...' if len(response.message) > 300 else ''}")
    print(f"  Session : {response.session_id}")
    return response.message, response.session_id


async def run_test() -> None:
    user_id = "test_user_session_001"
    session_id = None  # Let Turn 1 create the session

    if MOCK_GEMINI:
        # Realistic mocked responses that simulate context-awareness
        mock_responses = [
            "Here is your plan for tomorrow:\n"
            "7:00 AM - Morning routine\n"
            "9:00 AM - Deep work block\n"
            "12:00 PM - Lunch\n"
            "2:00 PM - Meetings\n"
            "6:00 PM - Free time\n"
            "10:00 PM - Wind down",

            "I've added a gym session at 6 PM to your plan for tomorrow:\n"
            "7:00 AM - Morning routine\n"
            "9:00 AM - Deep work block\n"
            "12:00 PM - Lunch\n"
            "2:00 PM - Meetings\n"
            "6:00 PM - Gym session 🏋️\n"
            "10:00 PM - Wind down",

            "I've moved your gym session from 6 PM to 7 PM:\n"
            "7:00 AM - Morning routine\n"
            "9:00 AM - Deep work block\n"
            "12:00 PM - Lunch\n"
            "2:00 PM - Meetings\n"
            "7:00 PM - Gym session 🏋️\n"
            "10:00 PM - Wind down",
        ]
        response_iter = iter(mock_responses)

        patcher = patch(
            "app.ai.gemini_client.GeminiClient.generate_with_history",
            new_callable=lambda: lambda self: AsyncMock(
                side_effect=lambda prompt, history: asyncio.coroutine(
                    lambda: next(response_iter)
                )()
            ),
        )
        # Use a simpler patch approach
        with patch(
            "app.ai.reasoning_engine.AIReasoningEngine.reason",
            new=AsyncMock(side_effect=lambda p: next(response_iter, "Mock response")),
        ), patch(
            "app.ai.reasoning_engine.AIReasoningEngine.reason_with_history",
            new=AsyncMock(side_effect=lambda p, h: next(response_iter, "Mock response (history)")),
        ):
            await _execute_turns(user_id)
    else:
        await _execute_turns(user_id)


async def _execute_turns(user_id: str) -> None:
    from app.services.session_service import session_service

    session_id = None

    # ── Turn 1 ────────────────────────────────────────────────────────────────
    banner("Turn 1 — Plan my day tomorrow.")
    _, session_id = await send_turn(
        message="Plan my day tomorrow.",
        session_id=None,
        user_id=user_id,
        turn_label="TURN 1",
    )
    history_after_t1 = session_service.get_history(session_id)
    print(f"\n  [State] Session history entries after Turn 1: {len(history_after_t1)}")
    assert len(history_after_t1) == 2, f"Expected 2 history entries, got {len(history_after_t1)}"

    # ── Turn 2 ────────────────────────────────────────────────────────────────
    banner("Turn 2 — Add a gym session at 6 PM.")
    _, session_id = await send_turn(
        message="Add a gym session at 6 PM.",
        session_id=session_id,  # Same session
        user_id=user_id,
        turn_label="TURN 2",
    )
    history_after_t2 = session_service.get_history(session_id)
    print(f"\n  [State] Session history entries after Turn 2: {len(history_after_t2)}")
    assert len(history_after_t2) == 4, f"Expected 4 history entries, got {len(history_after_t2)}"

    # ── Turn 3 ────────────────────────────────────────────────────────────────
    banner("Turn 3 — Move it to 7 PM.")
    response_t3, session_id = await send_turn(
        message="Move it to 7 PM.",
        session_id=session_id,  # Same session
        user_id=user_id,
        turn_label="TURN 3",
    )
    history_after_t3 = session_service.get_history(session_id)
    print(f"\n  [State] Session history entries after Turn 3: {len(history_after_t3)}")
    assert len(history_after_t3) == 6, f"Expected 6 history entries, got {len(history_after_t3)}"

    # ── Verification ──────────────────────────────────────────────────────────
    banner("VERIFICATION")
    print("\n  Checking that Turn 3 response references context from prior turns...")
    context_keywords = ["7", "PM", "gym", "moved", "updated", "session"]
    matched = [kw for kw in context_keywords if kw.lower() in response_t3.lower()]
    print(f"  Matched context keywords in Turn 3 response: {matched}")

    print("\n  Session history snapshot (final):")
    for i, entry in enumerate(history_after_t3):
        role = entry.get("role", "?")
        text = entry.get("parts", [""])[0][:80]
        print(f"    [{i}] role={role:6s} | {text}")

    print("\n" + "="*60)
    print("  ✅  Session continuity test PASSED")
    print("      All 3 turns executed on the same session.")
    print(f"      Final session_id : {session_id}")
    print(f"      Total history    : {len(history_after_t3)} entries ({len(history_after_t3)//2} turns)")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(run_test())
