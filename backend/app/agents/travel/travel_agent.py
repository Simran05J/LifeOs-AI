from app.agents.shared.base_agent import BaseAgent
from app.agents.shared.models import AgentRequest, AgentResponse
from app.agents.shared.exceptions import AgentValidationError, AgentExecutionError
from app.agents.travel.travel_service import TravelService


class TravelAgent(BaseAgent):
    """
    Travel Agent responsible for planning trips, generating itineraries,
    estimating travel budgets, and creating packing lists.

    Acts as the entry point for travel-related tasks and delegates
    all business operations to the TravelService.
    """

    def __init__(self) -> None:
        super().__init__(agent_name="travel")
        self.travel_service = TravelService()

    async def execute(self, request: AgentRequest) -> AgentResponse:
        """
        Execute the travel agent's task by delegating to the TravelService.

        Args:
            request: The standard AgentRequest containing user_id and payload.

        Returns:
            The standard AgentResponse wrapping the structured TravelResult data.

        Raises:
            AgentValidationError: If the request payload fails validation checks.
            AgentExecutionError: If planning or execution encounters a system failure.
        """
        try:
            travel_result = await self.travel_service.plan_trip(request.payload)
            return AgentResponse(
                success=travel_result.success,
                agent=self.agent_name,
                data=travel_result.dict(),
                message="Travel plan generated successfully."
            )
        except AgentValidationError:
            raise
        except AgentExecutionError:
            raise
        except Exception as exc:
            raise AgentExecutionError(f"TravelAgent execution failed: {exc}") from exc
