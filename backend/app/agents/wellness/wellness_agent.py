from app.agents.shared.base_agent import BaseAgent
from app.agents.shared.models import AgentRequest, AgentResponse


class WellnessAgent(BaseAgent):
    """
    Wellness Agent responsible for analyzing user mood, recommending
    wellness activities, and suggesting healthy routines.

    Business logic will be implemented in a later phase.
    """

    def __init__(self) -> None:
        super().__init__(agent_name="wellness")

    async def execute(self, request: AgentRequest) -> AgentResponse:
        """
        Execute the wellness agent's task.

        TODO: Implement wellness logic in a later phase.
        """
        raise NotImplementedError("WellnessAgent execution has not been implemented yet.")
