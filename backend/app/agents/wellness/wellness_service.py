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

        # Construct prompt
        prompt = (
            f"You are the LifeOS AI Wellness Agent.\n"
            f"Your role is to provide empathetic, supportive, and evidence-based general wellness guidance.\n"
            f"You do NOT diagnose or treat medical conditions.\n\n"
            f"User Context:\n"
            f"- Message: \"{validated_request.user_message}\"\n"
            f"- {mood_str}\n"
            f"- {stress_str}\n"
            f"- {goals_str}\n"
            f"- {preferences_str}\n\n"
            f"Analyze the user's wellness context and respond ONLY with a valid JSON object matching this structure:\n"
            f"{{\n"
            f"  \"success\": true,\n"
            f"  \"mood_analysis\": \"Empathetic analysis of the user's emotional and mental state.\",\n"
            f"  \"recommendations\": [\n"
            f"    \"Personalized activity or practice recommendation 1\",\n"
            f"    \"Personalized activity or practice recommendation 2\"\n"
            f"  ],\n"
            f"  \"healthy_routine\": [\n"
            f"    \"Morning: Suggested morning routine step\",\n"
            f"    \"Afternoon: Suggested afternoon step\",\n"
            f"    \"Evening: Suggested evening step\"\n"
            f"  ],\n"
            f"  \"wellness_tips\": [\n"
            f"    \"General wellness tip 1\",\n"
            f"    \"General wellness tip 2\"\n"
            f"  ],\n"
            f"  \"summary\": \"Brief, supportive summary of guidance provided.\"\n"
            f"}}\n"
            f"Do not add explanations, markdown code blocks, or extra text. Output only raw JSON."
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
                summary=data.get("summary", "Wellness analysis completed successfully.")
            )

        except json.JSONDecodeError:
            return WellnessResult(
                success=False,
                summary=f"Failed to parse wellness JSON from model response: {raw_response}"
            )
        except Exception as exc:
            raise AgentExecutionError(f"Wellness agent execution failed: {exc}") from exc
