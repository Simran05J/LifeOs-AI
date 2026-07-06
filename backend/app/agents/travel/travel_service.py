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
        trip_duration = 0
        if validated_request.start_date and validated_request.end_date:
            trip_duration = (validated_request.end_date - validated_request.start_date).days + 1

        time_context = payload.get("time_context") or f"Current Date: {validated_request.start_date or ''}"
        timezone_str = payload.get("timezone", "Asia/Kolkata")
        existing_trips = payload.get("existing_trips") or []
        existing_trips_str = "\n".join(
            [
                f"- ID: {trip.get('id')}, Destination: {trip.get('destination')}, Budget: {trip.get('budget')}, Dates: {trip.get('startDate')} to {trip.get('endDate')}, Status: {trip.get('status')}"
                for trip in existing_trips
            ]
        ) if existing_trips else "No existing trips."

        # Construct prompt
        prompt = (
            f"You are the LifeOS AI Travel Agent.\n"
            f"Your job is to manage the user's travel plans. You support CRUD operations (Create, Update, Delete, List).\n"
            f"\n"
            f"--- CURRENT TIME CONTEXT ---\n"
            f"{time_context}\n"
            f"Timezone: {timezone_str}\n"
            f"---\n"
            f"\n"
            f"--- EXISTING TRIPS ---\n"
            f"{existing_trips_str}\n"
            f"---\n"
            f"\n"
            f"User Query: \"{validated_request.query}\"\n"
            f"\n"
            f"Determine the user's intent. If creating/planning, generating an itinerary is required. "
            f"If updating/cancelling/deleting, look up the trip ID from the existing trips list and output a delete or update action.\n"
            f"All output dates/times must be in the local timezone (YYYY-MM-DD).\n"
            f"\n"
            f"Respond ONLY with a valid JSON object:\n"
            f"{{\n"
            f"  \"success\": true,\n"
            f"  \"destination\": \"Confirmed destination name or null\",\n"
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
            f"  \"summary\": \"A friendly, conversational, and natural response to the user. Summarize what you did (if you planned/updated/deleted a trip), or politely ask the user for details (such as destination, dates, budget) if they are missing. Speak like a helpful personal assistant.\",\n"
            f"  \"actions\": [\n"
            f"     {{\n"
            f"        \"action\": \"create\" / \"update\" / \"delete\",\n"
            f"        \"entity_type\": \"trip\",\n"
            f"        \"entity_id\": \"trip-id-if-update-or-delete-else-null\",\n"
            f"        \"data\": {{\n"
            f"            \"destination\": \"string\",\n"
            f"            \"budget\": 0.0,\n"
            f"            \"start_date\": \"YYYY-MM-DD\",\n"
            f"            \"end_date\": \"YYYY-MM-DD\",\n"
            f"            \"itinerary\": [],\n"
            f"            \"packing_list\": [],\n"
            f"            \"status\": \"planned/ongoing/completed/cancelled\"\n"
            f"        }}\n"
            f"     }},\n"
            f"     {{\n"
            f"        \"action\": \"create\",\n"
            f"        \"entity_type\": \"reminder\",\n"
            f"        \"entity_id\": null,\n"
            f"        \"data\": {{\n"
            f"            \"title\": \"Departure for Goa Trip\",\n"
            f"            \"description\": \"Don't forget the flight/trip start!\",\n"
            f"            \"time\": \"YYYY-MM-DDTHH:MM:SS\",\n"
            f"            \"priority\": \"high\",\n"
            f"            \"is_completed\": false\n"
            f"        }}\n"
            f"     }}\n"
            f"  ] or null\n"
            f"}}\n"
            f"Do not add explanations or markdown. Output only raw JSON."
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
                summary=data.get("summary", "Travel plan processed."),
                actions=data.get("actions")
            )

        except json.JSONDecodeError:
            return TravelResult(
                success=False,
                destination=validated_request.destination,
                summary=f"Failed to parse travel plan JSON from model response: {raw_response}"
            )
        except Exception as exc:
            raise AgentExecutionError(f"Travel agent execution failed: {exc}") from exc
