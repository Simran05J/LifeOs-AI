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
        prompt = (
            f"You are the LifeOS AI Reminder Agent.\n"
            f"Your job is to parse the user's query and extract details for scheduling a reminder.\n"
            f"Current Time context: {validated_request.current_time.isoformat()}\n"
            f"User Query: \"{validated_request.query}\"\n\n"
            f"Analyze the query and respond ONLY with a valid JSON object matching the following structure:\n"
            f"{{\n"
            f"  \"success\": true,\n"
            f"  \"reminder_title\": \"Brief title of what to remind\",\n"
            f"  \"reminder_description\": \"Additional details/context or null\",\n"
            f"  \"reminder_time\": \"ISO 8601 format (YYYY-MM-DDTHH:MM:SS) of when the reminder should trigger\",\n"
            f"  \"recurrence\": \"daily/weekly/monthly/yearly or null\",\n"
            f"  \"summary\": \"Concise textual summary of what was scheduled\"\n"
            f"}}\n"
            f"Do not add any explanations, markdown code blocks, or extra text. Output only raw JSON."
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
                summary=data.get("summary", "Reminder parsed successfully.")
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
