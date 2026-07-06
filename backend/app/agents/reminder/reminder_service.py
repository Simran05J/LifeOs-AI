import json
import re
from datetime import datetime
from typing import Any
from app.agents.shared.exceptions import AgentValidationError, AgentExecutionError
from app.ai.reasoning_engine import AIReasoningEngine
from app.agents.reminder.models.reminder_request import ReminderRequest
from app.agents.reminder.models.reminder_result import ReminderResult


class ReminderService:
    """
    Service responsible for coordinating reminder-related operations.
    Communicates with the AI Reasoning Engine to parse natural language reminder instructions.
    """

    def __init__(self) -> None:
        self.reasoning_engine = AIReasoningEngine()

    async def parse_reminder(self, request: Any) -> ReminderResult:
        """
        Processes a reminder request, calls the AI reasoning engine to parse the instruction,
        and returns a structured ReminderResult.

        Args:
            request: The reminder request payload (either ReminderRequest instance or dictionary).

        Returns:
            The structured ReminderResult containing parsed reminder details.

        Raises:
            AgentValidationError: If input validation fails.
            AgentExecutionError: If AI reasoning or parsing fails.
        """
        # Validate request
        try:
            if hasattr(request, "dict"):
                payload = request.dict()
            elif isinstance(request, dict):
                payload = request
            else:
                raise ValueError("Unsupported request format.")

            # Extract conversation history before Pydantic validation
            conversation_history: list[dict] = payload.pop("conversation_history", []) or []

            validated_request = ReminderRequest(**payload)
        except Exception as exc:
            raise AgentValidationError(f"Invalid reminder request: {exc}") from exc

        # Construct prompt
        time_context = payload.get("time_context") or f"Current time: {validated_request.current_time.isoformat()}"
        timezone_str = payload.get("timezone", "Asia/Kolkata")
        existing_reminders = payload.get("existing_reminders") or []
        existing_reminders_str = "\n".join(
            [
                f"- ID: {rem.get('id')}, Title: {rem.get('title')}, Time: {rem.get('time') or rem.get('remind_at') or ''}, Completed: {rem.get('completed')}"
                for rem in existing_reminders
            ]
        ) if existing_reminders else "No existing reminders."

        prompt = (
            f"You are the LifeOS AI Reminder Agent.\n"
            f"Your job is to manage the user's reminders. You support CRUD operations (Create, Update, Delete, List).\n"
            f"\n"
            f"--- CURRENT TIME CONTEXT ---\n"
            f"{time_context}\n"
            f"Timezone: {timezone_str}\n"
            f"---\n"
            f"\n"
            f"--- EXISTING REMINDERS ---\n"
            f"{existing_reminders_str}\n"
            f"---\n"
            f"\n"
            f"STRICT TIME RULES:\n"
            f"1. NEVER schedule reminders in the past. If calculated time < current local time, auto-advance to next valid occurrence.\n"
            f"2. 'in 10 minutes' = current_time + 10 minutes.\n"
            f"3. 'tomorrow' = next calendar day at 9:00 AM (local) unless a time is specified.\n"
            f"4. 'tonight' = today at 8:00 PM (local) if not yet passed, else tomorrow 8 PM.\n"
            f"5. 'next Monday' = the Monday of the coming week (never today).\n"
            f"6. All reminder_time values MUST be in the user's LOCAL timezone, NOT UTC.\n"
            f"7. Output reminder_time as YYYY-MM-DDTHH:MM:SS (no Z, no offset) in local time.\n"
            f"\n"
            f"User Query: \"{validated_request.query}\"\n"
            f"\n"
            f"Respond ONLY with a valid JSON object:\n"
            f"{{\n"
            f"  \"success\": true,\n"
            f"  \"reminder_title\": \"Brief title of what to remind or null\",\n"
            f"  \"reminder_description\": \"Additional details/context or null\",\n"
            f"  \"reminder_time\": \"YYYY-MM-DDTHH:MM:SS in user local time or null\",\n"
            f"  \"recurrence\": \"daily/weekly/monthly/yearly or null\",\n"
            f"  \"summary\": \"A friendly, conversational, and natural response to the user summarizing the reminder created, updated, or deleted. Ask for specific time or title details if they are missing from the request.\",\n"
            f"  \"actions\": [\n"
            f"     {{\n"
            f"        \"action\": \"create\" / \"update\" / \"delete\",\n"
            f"        \"entity_type\": \"reminder\",\n"
            f"        \"entity_id\": \"reminder-id-if-update-or-delete-else-null\",\n"
            f"        \"data\": {{\n"
            f"            \"title\": \"Title\",\n"
            f"            \"description\": \"Description\",\n"
            f"            \"remind_at\": \"YYYY-MM-DDTHH:MM:SS in local time\",\n"
            f"            \"priority\": \"low/medium/high\",\n"
            f"            \"is_completed\": false\n"
            f"        }}\n"
            f"     }}\n"
            f"  ] or null\n"
            f"}}\n"
            f"Output only raw JSON. No markdown, no explanations."
        )

        try:
            # Delegate AI reasoning — history-aware when session history is present
            if conversation_history:
                raw_response = await self.reasoning_engine.reason_with_history(
                    prompt, conversation_history
                )
            else:
                raw_response = await self.reasoning_engine.reason(prompt)

            # Clean and parse the JSON response
            json_text = raw_response.strip()
            if json_text.startswith("```"):
                match = re.search(r"```(?:json)?\s*(.*?)\s*```", json_text, re.DOTALL)
                if match:
                    json_text = match.group(1)

            data = json.loads(json_text)

            # Parse the reminder time
            reminder_time_str = data.get("reminder_time")
            reminder_time = None
            if reminder_time_str:
                try:
                    reminder_time = datetime.fromisoformat(reminder_time_str)
                except ValueError:
                    pass

            return ReminderResult(
                success=data.get("success", True),
                reminder_title=data.get("reminder_title"),
                reminder_description=data.get("reminder_description"),
                reminder_time=reminder_time,
                recurrence=data.get("recurrence"),
                summary=data.get("summary", "Reminder parsed successfully."),
                actions=data.get("actions")
            )

        except json.JSONDecodeError:
            # Fallback if AI output is not valid JSON
            return ReminderResult(
                success=False,
                summary=f"Failed to parse reminder JSON from model response: {raw_response}",
                reminder_title=validated_request.query
            )
        except Exception as exc:
            raise AgentExecutionError(f"Reminder agent failed during execution: {exc}") from exc
