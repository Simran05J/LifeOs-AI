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

    async def reason_with_history(self, prompt: str, history: list[dict]) -> str:
        """
        Evaluate a prompt in the context of prior conversation history.

        Delegates to GeminiClient.generate_with_history() which uses the Gemini
        ChatSession API so the model can resolve pronouns and references across turns
        (e.g. "Move it to 7 PM" after "Add a gym session at 6 PM").

        Args:
            prompt:  The current user message / reasoning task.
            history: Ordered list of prior turns in Gemini format:
                     [{"role": "user"|"model", "parts": ["<text>"]}, ...]
                     Pass an empty list for a fresh session.

        Returns:
            The text response from the model.

        Raises:
            AgentExecutionError: If the prompt is invalid or the client execution fails.
        """
        if not prompt or not prompt.strip():
            raise AgentExecutionError("Reasoning prompt cannot be empty.")

        try:
            return await self.gemini_client.generate_with_history(prompt, history or [])
        except AgentExecutionError:
            raise
        except Exception as exc:
            raise AgentExecutionError(
                f"AI reasoning engine (history-aware) encountered an error: {exc}"
            ) from exc

