from app.agents.shared.base_agent import BaseAgent
from app.agents.shared.models import AgentRequest, AgentResponse


class FinanceAgent(BaseAgent):
    """
    Finance Agent responsible for analyzing expenses, tracking spending,
    suggesting budgets, and generating financial insights.

    Business logic will be implemented in a later phase.
    """

    def __init__(self) -> None:
        super().__init__(agent_name="finance")

    async def execute(self, request: AgentRequest) -> AgentResponse:
        """
        Execute the finance agent's task.

        TODO: Implement finance logic in a later phase.
        """
        raise NotImplementedError("FinanceAgent execution has not been implemented yet.")
