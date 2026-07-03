from typing import Any
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

        When ``conversation_history`` is present in the payload the engine is called
        with history so the model can resolve references to prior turns (e.g.
        "Move it to 7 PM" after "Add a gym session at 6 PM").
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
            # (it is not part of PlannerRequest and would cause a validation error)
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

        prompt = (
            f"Please help me plan my schedule.\n"
            f"User Query: {validated_request.query}\n"
            f"Target Date: {validated_request.target_date}\n"
            f"Existing Tasks:\n{existing_tasks_str}\n"
        )

        # Call AIReasoningEngine — use history-aware path when history is available
        if conversation_history:
            raw_response = await self.reasoning_engine.reason_with_history(
                prompt, conversation_history
            )
        else:
            raw_response = await self.reasoning_engine.reason(prompt)

        # Convert the response into a PlannerResult object
        return PlannerResult(
            success=True,
            generated_plan={},
            recommendations=[],
            summary=raw_response
        )
