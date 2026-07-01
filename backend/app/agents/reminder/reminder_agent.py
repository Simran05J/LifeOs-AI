from app.agents.shared.base_agent import BaseAgent
from app.agents.shared.models import AgentRequest, AgentResponse


class ReminderAgent(BaseAgent):
    """
    Reminder Agent responsible for creating, updating, deleting reminders
    and scheduling notifications.

    Business logic will be implemented in a later phase.
    """

    def __init__(self) -> None:
        super().__init__(agent_name="reminder")

    async def execute(self, request: AgentRequest) -> AgentResponse:
        """
        Execute the reminder agent's task.

        TODO: Implement reminder logic in a later phase.
        """
        raise NotImplementedError("ReminderAgent execution has not been implemented yet.")
