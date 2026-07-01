from app.ai.gemini_client import GeminiClient
from app.agents.shared.exceptions import AgentExecutionError


class AIReasoningEngine:
    """
    Generic AI Reasoning Engine responsible for orchestrating reasoning tasks
    across all AI agents by communicating with the GeminiClient.
    """

    def __init__(self) -> None:
        self.gemini_client = GeminiClient()

    async def reason(self, prompt: str) -> str:
        """
        Evaluate a prompt and generate a reasoning response asynchronously.

        Args:
            prompt: The text prompt to be sent to the model.

        Returns:
            The text response from the model.

        Raises:
            AgentExecutionError: If the prompt is invalid or the client execution fails.
        """
        if not prompt or not prompt.strip():
            raise AgentExecutionError("Reasoning prompt cannot be empty.")

        try:
            return await self.gemini_client.generate(prompt)
        except AgentExecutionError:
            raise
        except Exception as exc:
            raise AgentExecutionError(f"AI reasoning engine encountered an error: {exc}") from exc
