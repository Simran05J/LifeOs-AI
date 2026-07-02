import json
import re
from typing import Any
from app.agents.shared.exceptions import AgentValidationError, AgentExecutionError
from app.ai.reasoning_engine import AIReasoningEngine
from app.agents.travel.models.travel_request import TravelRequest
from app.agents.travel.models.travel_result import TravelResult


class TravelService:
    """
    Service responsible for coordinating travel planning operations.
    Communicates with the AI Reasoning Engine to generate itineraries, budget breakdowns,
    packing lists, and destination-specific travel tips.
    """

    def __init__(self) -> None:
        self.reasoning_engine = AIReasoningEngine()

    async def plan_trip(self, request: Any) -> TravelResult:
        """
        Processes a travel planning request by validating the input, constructing
        a structured prompt, delegating to the AI reasoning engine, and returning
        a structured TravelResult.

        Args:
            request: The travel request payload (either TravelRequest instance or dictionary).

        Returns:
            The structured TravelResult containing the generated trip plan.

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

            validated_request = TravelRequest(**payload)
        except Exception as exc:
            raise AgentValidationError(f"Invalid travel request: {exc}") from exc

        # Calculate trip duration
        trip_duration = (validated_request.end_date - validated_request.start_date).days + 1

        # Construct prompt
        preferences_str = validated_request.preferences or "No specific preferences provided."
        prompt = (
            f"You are the LifeOS AI Travel Agent.\n"
            f"Your job is to create a comprehensive travel plan for the user.\n\n"
            f"Trip Details:\n"
            f"- Destination: {validated_request.destination}\n"
            f"- Start Date: {validated_request.start_date}\n"
            f"- End Date: {validated_request.end_date}\n"
            f"- Duration: {trip_duration} day(s)\n"
            f"- Number of Travelers: {validated_request.traveler_count}\n"
            f"- Total Budget: {validated_request.budget}\n"
            f"- Preferences: {preferences_str}\n\n"
            f"Create a detailed travel plan and respond ONLY with a valid JSON object matching this structure:\n"
            f"{{\n"
            f"  \"success\": true,\n"
            f"  \"destination\": \"Confirmed destination name\",\n"
            f"  \"itinerary\": [\n"
            f"    {{\n"
            f"      \"day\": 1,\n"
            f"      \"date\": \"YYYY-MM-DD\",\n"
            f"      \"morning\": \"Morning activity\",\n"
            f"      \"afternoon\": \"Afternoon activity\",\n"
            f"      \"evening\": \"Evening activity\",\n"
            f"      \"accommodation\": \"Hotel/stay info\"\n"
            f"    }}\n"
            f"  ],\n"
            f"  \"estimated_budget\": {{\n"
            f"    \"accommodation\": 0.0,\n"
            f"    \"food\": 0.0,\n"
            f"    \"transport\": 0.0,\n"
            f"    \"activities\": 0.0,\n"
            f"    \"miscellaneous\": 0.0,\n"
            f"    \"total\": 0.0\n"
            f"  }},\n"
            f"  \"packing_list\": [\"Item 1\", \"Item 2\"],\n"
            f"  \"travel_tips\": [\"Tip 1\", \"Tip 2\"],\n"
            f"  \"summary\": \"Overall summary of the travel plan.\"\n"
            f"}}\n"
            f"Do not add explanations, markdown code blocks, or extra text. Output only raw JSON."
        )

        try:
            # Delegate to AIReasoningEngine
            raw_response = await self.reasoning_engine.reason(prompt)

            # Clean and parse JSON response
            json_text = raw_response.strip()
            if json_text.startswith("```"):
                match = re.search(r"```(?:json)?\s*(.*?)\s*```", json_text, re.DOTALL)
                if match:
                    json_text = match.group(1)

            data = json.loads(json_text)

            return TravelResult(
                success=data.get("success", True),
                destination=data.get("destination"),
                itinerary=data.get("itinerary", []),
                estimated_budget=data.get("estimated_budget", {}),
                packing_list=data.get("packing_list", []),
                travel_tips=data.get("travel_tips", []),
                summary=data.get("summary", "Travel plan generated successfully.")
            )

        except json.JSONDecodeError:
            return TravelResult(
                success=False,
                destination=validated_request.destination,
                summary=f"Failed to parse travel plan JSON from model response: {raw_response}"
            )
        except Exception as exc:
            raise AgentExecutionError(f"Travel agent execution failed: {exc}") from exc
