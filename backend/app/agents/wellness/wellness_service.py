import json
import re
from typing import Any
from app.agents.shared.exceptions import AgentValidationError, AgentExecutionError
from app.ai.reasoning_engine import AIReasoningEngine
from app.agents.wellness.models.wellness_request import WellnessRequest
from app.agents.wellness.models.wellness_result import WellnessResult


class WellnessService:
    """
    Service responsible for coordinating wellness-related operations.
    Communicates with the AI Reasoning Engine to analyze the user's emotional
    state and generate personalized wellness recommendations.

    This service provides general wellness guidance only and does not
    diagnose or treat medical conditions.
    """

    def __init__(self) -> None:
        self.reasoning_engine = AIReasoningEngine()

    async def analyze_wellness(self, request: Any) -> WellnessResult:
        """
        Processes a wellness request, calls the AI reasoning engine to analyze
        the user's state, and returns a structured WellnessResult.

        Args:
            request: The wellness request payload (either WellnessRequest instance or dictionary).

        Returns:
            The structured WellnessResult containing mood analysis and wellness guidance.

        Raises:
            AgentValidationError: If input validation fails.
            AgentExecutionError: If AI reasoning or response parsing fails.
        """
        # Validate request
        try:
            if hasattr(request, "dict"):
                payload = request.dict()
            elif isinstance(request, dict):
                payload = request
            else:
                raise ValueError("Unsupported request format.")

            validated_request = WellnessRequest(**payload)
        except Exception as exc:
            raise AgentValidationError(f"Invalid wellness request: {exc}") from exc

        # Build optional context strings
        mood_str = f"Current Mood: {validated_request.mood}" if validated_request.mood else "Current Mood: Not specified."
        stress_str = f"Stress Level: {validated_request.stress_level}/10" if validated_request.stress_level is not None else "Stress Level: Not specified."
        goals_str = f"Wellness Goals: {validated_request.goals}" if validated_request.goals else "Wellness Goals: Not specified."
        preferences_str = f"Activity Preferences: {validated_request.preferences}" if validated_request.preferences else "Activity Preferences: None specified."

        time_context = payload.get("time_context") or "Current Date: Unknown"
        timezone_str = payload.get("timezone", "Asia/Kolkata")
        existing_wellness = payload.get("existing_wellness") or []
        existing_wellness_str = "\n".join(
            [
                f"- ID: {w.get('id')}, Category: {w.get('category')}, Target: {w.get('target')}, Current: {w.get('current')}, Unit: {w.get('unit')}, Frequency: {w.get('frequency')}, Title: {w.get('title') or 'N/A'}"
                for w in existing_wellness
            ]
        ) if existing_wellness else "No wellness records provided."

        # Construct prompt
        prompt = (
            f"You are the LifeOS AI Wellness Agent.\n"
            f"Your job is to manage the user's wellness logs and habits. You support CRUD operations (Create, Update, Delete, List).\n"
            f"You do NOT diagnose or treat medical conditions.\n"
            f"\n"
            f"--- CURRENT TIME CONTEXT ---\n"
            f"{time_context}\n"
            f"Timezone: {timezone_str}\n"
            f"---\n"
            f"\n"
            f"--- EXISTING WELLNESS RECORDS ---\n"
            f"{existing_wellness_str}\n"
            f"---\n"
            f"\n"
            f"User Context:\n"
            f"- Message: \"{validated_request.user_message}\"\n"
            f"- {mood_str}\n"
            f"- {stress_str}\n"
            f"- {goals_str}\n"
            f"- {preferences_str}\n\n"
            f"Analyze the user's request and respond ONLY with a valid JSON object matching this structure:\n"
            f"{{\n"
            f"  \"success\": true,\n"
            f"  \"mood_analysis\": \"Empathetic analysis of the user's emotional and mental state.\",\n"
            f"  \"recommendations\": [\n"
            f"    \"Personalized activity or practice recommendation 1\"\n"
            f"  ],\n"
            f"  \"healthy_routine\": [\n"
            f"    \"Suggested routine step\"\n"
            f"  ],\n"
            f"  \"wellness_tips\": [\n"
            f"    \"General tip\"\n"
            f"  ],\n"
            f"  \"summary\": \"A friendly, conversational, and natural response to the user. Explain any wellness guidance or actions taken, or politely ask the user for clarification/details if needed.\",\n"
            f"  \"logged_activity\": null,\n"
            f"  \"actions\": [\n"
            f"     {{\n"
            f"        \"action\": \"create\" / \"update\" / \"delete\",\n"
            f"        \"entity_type\": \"wellness\" / \"reminder\",\n"
            f"        \"entity_id\": \"wellness-id-if-update-or-delete-else-null\",\n"
            f"        \"data\": {{\n"
            f"             \"title\": \"Activity name (e.g. Water Tracking)\",\n"
            f"             \"category\": \"water/exercise/sleep/meditation/nutrition/custom\",\n"
            f"             \"target\": 1.0,\n"
            f"             \"current\": 0.0,\n"
            f"             \"unit\": \"L/ml/min/hr/etc\",\n"
            f"             \"frequency\": \"daily/weekly/monthly\",\n"
            f"             \"notes\": \"any additional notes\",\n"
            f"             \"description\": \"For reminders, a short description\",\n"
            f"             \"time\": \"YYYY-MM-DDTHH:MM:SS (local time)\",\n"
            f"             \"priority\": \"low/medium/high\",\n"
            f"             \"is_completed\": false\n"
            f"        }}\n"
            f"     }}\n"
            f"  ] or null\n"
            f"}}\n"
            f"Do not add explanations or markdown. Output only raw JSON."
        )

        try:
            # Delegate AI reasoning to AIReasoningEngine
            raw_response = await self.reasoning_engine.reason(prompt)

            # Clean and parse the JSON response
            json_text = raw_response.strip()
            if json_text.startswith("```"):
                match = re.search(r"```(?:json)?\s*(.*?)\s*```", json_text, re.DOTALL)
                if match:
                    json_text = match.group(1)

            data = json.loads(json_text)

            return WellnessResult(
                success=data.get("success", True),
                mood_analysis=data.get("mood_analysis", ""),
                recommendations=data.get("recommendations", []),
                healthy_routine=data.get("healthy_routine", []),
                wellness_tips=data.get("wellness_tips", []),
                summary=data.get("summary", "Wellness guidance generated."),
                logged_activity=data.get("logged_activity"),
                actions=data.get("actions")
            )

        except json.JSONDecodeError:
            return WellnessResult(
                success=False,
                summary=f"Failed to parse wellness JSON from model response: {raw_response}"
            )
        except Exception as exc:
            raise AgentExecutionError(f"Wellness agent execution failed: {exc}") from exc
