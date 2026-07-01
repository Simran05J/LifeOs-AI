from app.agents.shared.base_agent import BaseAgent
from app.agents.shared.models import AgentRequest, AgentResponse
from app.agents.shared.exceptions import AgentValidationError, AgentExecutionError
from app.agents.reminder.reminder_service import ReminderService


class ReminderAgent(BaseAgent):
    """
    Reminder Agent responsible for parsing natural language reminder instructions
    and coordinating trigger settings by delegating to the ReminderService.
    """

    def __init__(self) -> None:
        super().__init__(agent_name="reminder")
        self.reminder_service = ReminderService()

    async def execute(self, request: AgentRequest) -> AgentResponse:
        """
        Execute the reminder agent's task by delegating parsing and validation
        to the ReminderService.

        Args:
            request: The standard AgentRequest containing user_id and payload.

        Returns:
            The standard AgentResponse wrapping the parsed ReminderResult data.

        Raises:
            AgentValidationError: If the request payload fails validation checks.
            AgentExecutionError: If parsing or execution encounters a system failure.
        """
        try:
            reminder_result = await self.reminder_service.parse_reminder(request.payload)
            return AgentResponse(
                success=reminder_result.success,
                agent=self.agent_name,
                data=reminder_result.dict(),
                message="Reminder request processed successfully."
            )
        except AgentValidationError:
            raise
        except AgentExecutionError:
            raise
        except Exception as exc:
            raise AgentExecutionError(f"ReminderAgent execution failed: {exc}") from exc
