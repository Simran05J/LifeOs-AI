from app.agents.shared.base_agent import BaseAgent
from app.agents.shared.models import AgentRequest, AgentResponse
from app.agents.shared.exceptions import AgentValidationError, AgentExecutionError
from app.agents.finance.finance_service import FinanceService


class FinanceAgent(BaseAgent):
    """
    Finance Agent responsible for analyzing expenses, tracking spending,
    suggesting budgets, and generating financial insights.

    Acts as the entry point for finance-related tasks and delegates
    all business operations to the FinanceService.
    """

    def __init__(self) -> None:
        super().__init__(agent_name="finance")
        self.finance_service = FinanceService()

    async def execute(self, request: AgentRequest) -> AgentResponse:
        """
        Execute the finance agent's task by delegating to the FinanceService.

        Args:
            request: The standard AgentRequest containing user_id and payload.

        Returns:
            The standard AgentResponse wrapping the structured FinanceResult data.

        Raises:
            AgentValidationError: If the request payload fails validation checks.
            AgentExecutionError: If analysis or execution encounters a system failure.
        """
        try:
            finance_result = await self.finance_service.analyze_finances(request.payload)
            return AgentResponse(
                success=finance_result.success,
                agent=self.agent_name,
                data=finance_result.dict(),
                message="Finance analysis completed successfully."
            )
        except AgentValidationError:
            raise
        except AgentExecutionError:
            raise
        except Exception as exc:
            raise AgentExecutionError(f"FinanceAgent execution failed: {exc}") from exc
