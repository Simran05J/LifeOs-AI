import json
import re
from typing import Any, Optional
from app.agents.shared.exceptions import AgentValidationError
from app.ai.reasoning_engine import AIReasoningEngine
from app.agents.planner.models.planner_request import PlannerRequest as NewPlannerRequest
from app.agents.planner.models.planner_result import PlannerResult


class PlannerService:
    """
    Service responsible for coordinating planner-related operations.
    Communicates with the AI Reasoning Engine to generate plans.
    """

    def __init__(self) -> None:
        self.reasoning_engine = AIReasoningEngine()

    async def generate_plan(self, request: Any) -> PlannerResult:
        """
        Coordinates planner processing to generate a plan based on the request.
        Validates the request, constructs the prompt, calls the AI reasoning engine,
        and wraps the response in a PlannerResult object.
        """
        # Validate request and support backward compatibility
        try:
            if hasattr(request, "dict"):
                payload = request.dict()
            elif isinstance(request, dict):
                payload = request
            else:
                raise ValueError("Unsupported request format.")

            # Extract conversation history before Pydantic validation
            conversation_history: list[dict] = payload.pop("conversation_history", []) or []

            validated_request = NewPlannerRequest(**payload)
        except Exception as exc:
            raise AgentValidationError(f"Invalid planner request: {exc}") from exc

        # Construct the planning prompt using query, target_date, and existing tasks
        existing_tasks_str = "\n".join(
            [
                f"- {task.title} (Priority: {task.priority}, Status: {task.status}, Time: {task.start_time} to {task.end_time})"
                for task in validated_request.existing_tasks
            ]
        ) if validated_request.existing_tasks else "None"

        time_context = payload.get("time_context") or f"Target date: {validated_request.target_date}"
        timezone_str = payload.get("timezone", "Asia/Kolkata")
        existing_tasks = payload.get("existing_tasks") or []
        existing_tasks_str = "\n".join(
            [
                f"- ID: {task.get('id')}, Title: {task.get('title')}, Priority: {task.get('priority')}, Status: {task.get('status')}, Due: {task.get('due_date') or task.get('dueDate')}"
                for task in existing_tasks
            ]
        ) if existing_tasks else "None"

        prompt = (
            f"You are the LifeOS AI Planner Agent.\n"
            f"Your job is to manage the user's schedule/tasks. You support CRUD operations (Create, Update, Delete, List).\n"
            f"\n"
            f"--- CURRENT TIME CONTEXT ---\n"
            f"{time_context}\n"
            f"Timezone: {timezone_str}\n"
            f"---\n"
            f"\n"
            f"--- EXISTING TASKS ---\n"
            f"{existing_tasks_str}\n"
            f"---\n"
            f"\n"
            f"TIME RULES:\n"
            f"1. 'tomorrow' = next calendar day. Default time: 9:00 AM local.\n"
            f"2. 'tonight' / 'this evening' = today at 8:00 PM local.\n"
            f"3. 'next Monday' = the Monday of the coming week.\n"
            f"4. All due_date values MUST be in the user's LOCAL timezone, NOT UTC.\n"
            f"5. Output due_date as YYYY-MM-DDTHH:MM:SS (no Z, no offset) in local time.\n"
            f"6. If no specific time is mentioned: tasks → 9 AM, meetings → require explicit time, shopping → 6 PM.\n"
            f"\n"
            f"User Query: {validated_request.query}\n"
            f"\n"
            f"Respond ONLY with a valid JSON object:\n"
            f"{{\n"
            f"  \"success\": true,\n"
            f"  \"generated_plan\": {{\n"
            f"     \"tasks\": []\n"
            f"  }},\n"
            f"  \"recommendations\": [\"Tip 1\", \"Tip 2\"],\n"
            f"  \"summary\": \"A friendly, conversational, and natural response to the user detailing the planner tasks created, updated, or deleted, or asking for more details if they want to plan something but didn't specify tasks.\",\n"
            f"  \"actions\": [\n"
            f"     {{\n"
            f"        \"action\": \"create\" / \"update\" / \"delete\",\n"
            f"        \"entity_type\": \"task\",\n"
            f"        \"entity_id\": \"task-id-if-update-or-delete-else-null\",\n"
            f"        \"data\": {{\n"
            f"           \"title\": \"Brief title of the task to add/do\",\n"
            f"           \"description\": \"Additional details/notes or empty string\",\n"
            f"           \"due_date\": \"YYYY-MM-DDTHH:MM:SS in user local time, or null\",\n"
            f"           \"priority\": \"low/medium/high\",\n"
            f"           \"status\": \"todo/in_progress/completed\",\n"
            f"           \"tags\": [\"tag1\", \"tag2\"]\n"
            f"        }}\n"
            f"     }},\n"
            f"     {{\n"
            f"        \"action\": \"create\",\n"
            f"        \"entity_type\": \"reminder\",\n"
            f"        \"entity_id\": null,\n"
            f"        \"data\": {{\n"
            f"            \"title\": \"Do study timetable\",\n"
            f"            \"description\": \"Study timetable reminder\",\n"
            f"            \"time\": \"YYYY-MM-DDTHH:MM:SS (in local time)\",\n"
            f"            \"priority\": \"high\",\n"
            f"            \"is_completed\": false\n"
            f"        }}\n"
            f"     }}\n"
            f"  ] or null\n"
            f"}}\n"
            f"Do not add any explanations or markdown. Output only raw JSON."
        )

        # Call AIReasoningEngine — use history-aware path when history is available
        if conversation_history:
            raw_response = await self.reasoning_engine.reason_with_history(
                prompt, conversation_history
            )
        else:
            raw_response = await self.reasoning_engine.reason(prompt)

        try:
            # Clean and parse JSON response
            json_text = raw_response.strip()
            if json_text.startswith("```"):
                match = re.search(r"```(?:json)?\s*(.*?)\s*```", json_text, re.DOTALL)
                if match:
                    json_text = match.group(1)

            data = json.loads(json_text)

            return PlannerResult(
                success=data.get("success", True),
                generated_plan=data.get("generated_plan", {}),
                recommendations=data.get("recommendations", []),
                summary=data.get("summary", "Planner tasks processed."),
                actions=data.get("actions")
            )
        except json.JSONDecodeError:
            # Fallback if AI output is not valid JSON
            return PlannerResult(
                success=False,
                generated_plan={},
                recommendations=[],
                summary=raw_response
            )
