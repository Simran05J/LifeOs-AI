from app.agents.shared.base_agent import BaseAgent
from app.agents.shared.models import AgentRequest, AgentResponse


class PlannerAgent(BaseAgent):
    """
    Planner Agent responsible for daily planning, scheduling,
    time blocking, and productivity suggestions.

    Business logic will be implemented in a later phase.
    """

    def __init__(self) -> None:
        super().__init__(agent_name="planner")

    async def execute(self, request: AgentRequest) -> AgentResponse:
        """
        Execute the planner agent's task.

        TODO: Implement planning logic in a later phase.
        """
        raise NotImplementedError("PlannerAgent execution has not been implemented yet.")
