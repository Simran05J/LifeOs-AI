from app.agents.shared.base_agent import BaseAgent
from app.agents.shared.models import AgentRequest, AgentResponse
from app.agents.shared.exceptions import AgentValidationError, AgentExecutionError
from app.agents.wellness.wellness_service import WellnessService


class WellnessAgent(BaseAgent):
    """
    Wellness Agent responsible for analyzing user mood, recommending
    wellness activities, and suggesting healthy routines.

    Acts as the entry point for wellness-related tasks and delegates
    all business operations to the WellnessService.
    """

    def __init__(self) -> None:
        super().__init__(agent_name="wellness")
        self.wellness_service = WellnessService()

    async def execute(self, request: AgentRequest) -> AgentResponse:
        """
        Execute the wellness agent's task by delegating to the WellnessService.

        Args:
            request: The standard AgentRequest containing user_id and payload.

        Returns:
            The standard AgentResponse wrapping the structured WellnessResult data.

        Raises:
            AgentValidationError: If the request payload fails validation checks.
            AgentExecutionError: If analysis or execution encounters a system failure.
        """
        try:
            wellness_result = await self.wellness_service.analyze_wellness(request.payload)
            return AgentResponse(
                success=wellness_result.success,
                agent=self.agent_name,
                data=wellness_result.dict(),
                message="Wellness analysis completed successfully."
            )
        except AgentValidationError:
            raise
        except AgentExecutionError:
            raise
        except Exception as exc:
            raise AgentExecutionError(f"WellnessAgent execution failed: {exc}") from exc
