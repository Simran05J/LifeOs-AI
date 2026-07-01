from app.agents.shared.base_agent import BaseAgent
from app.agents.shared.models import AgentRequest, AgentResponse
from app.agents.shared.exceptions import AgentValidationError, AgentExecutionError
from app.agents.planner.planner_service import PlannerService


class PlannerAgent(BaseAgent):
    """
    Planner Agent responsible for daily planning, scheduling,
    time blocking, and productivity suggestions.

    Acts as the entry point for planner-related tasks and delegates
    all planning operations and logic to the PlannerService.
    """

    def __init__(self) -> None:
        super().__init__(agent_name="planner")
        self.planner_service = PlannerService()

    async def execute(self, request: AgentRequest) -> AgentResponse:
        """
        Execute the planner agent's task by delegating to the PlannerService.

        Args:
            request: The standard AgentRequest containing user_id and payload.

        Returns:
            The standard AgentResponse containing the validated PlannerResult data.

        Raises:
            AgentValidationError: If input validation fails.
            AgentExecutionError: If execution encounters an error.
        """
        try:
            planner_result = await self.planner_service.generate_plan(request.payload)
            return AgentResponse(
                success=planner_result.success,
                agent=self.agent_name,
                data=planner_result.dict(),
                message="Planner response generated successfully."
            )
        except AgentValidationError:
            raise
        except AgentExecutionError:
            raise
        except Exception as exc:
            raise AgentExecutionError(f"PlannerAgent execution failed: {exc}") from exc