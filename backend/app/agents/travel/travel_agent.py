from app.agents.shared.base_agent import BaseAgent
from app.agents.shared.models import AgentRequest, AgentResponse


class TravelAgent(BaseAgent):
    """
    Travel Agent responsible for planning trips, generating itineraries,
    estimating travel budgets, and creating packing lists.

    Business logic will be implemented in a later phase.
    """

    def __init__(self) -> None:
        super().__init__(agent_name="travel")

    async def execute(self, request: AgentRequest) -> AgentResponse:
        """
        Execute the travel agent's task.

        TODO: Implement travel logic in a later phase.
        """
        raise NotImplementedError("TravelAgent execution has not been implemented yet.")
