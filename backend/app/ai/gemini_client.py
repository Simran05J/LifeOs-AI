import logging
import google.generativeai as genai

from app.config.settings import settings
from app.config.constants import DEFAULT_GEMINI_MODEL
from app.agents.shared.exceptions import AgentExecutionError

logger = logging.getLogger(__name__)


class GeminiClient:
    """
    Reusable AI reasoning engine responsible for all communication
    with the Google Gemini API.
    """

    def __init__(self) -> None:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self._model = genai.GenerativeModel(model_name=DEFAULT_GEMINI_MODEL)

    async def generate_response(self, prompt: str) -> str:
        """
        Send a prompt to Gemini and return the generated text response.

        Deprecated: Use generate() instead.
        """
        return await self.generate(prompt)

    async def generate(self, prompt: str) -> str:
        """
        Asynchronously send a prompt to the Google Gemini API and return the response.

        Args:
            prompt: The text prompt to be evaluated by the model.

        Returns:
            The trimmed text response from the model.

        Raises:
            AgentExecutionError: If the prompt is empty or the Gemini API call fails.
        """
        if not prompt or not prompt.strip():
            raise AgentExecutionError("Prompt cannot be empty.")

        cleaned_prompt = prompt.strip()
        try:
            response = await self._model.generate_content_async(cleaned_prompt)
            if not response or not response.text:
                raise AgentExecutionError("Received empty response from Gemini.")
            return response.text.strip()
        except Exception as exc:
            raise AgentExecutionError(
                f"Gemini API call failed: {exc}"
            ) from exc

    async def generate_with_history(
        self,
        prompt: str,
        history: list[dict],
    ) -> str:
        """
        Send a prompt to Gemini using a multi-turn ChatSession so the model
        has full awareness of the prior conversation.

        The ``history`` list must contain alternating user/model turns in the
        Gemini-native format produced by SessionService::

            [
                {"role": "user",  "parts": ["Plan my day tomorrow."]},
                {"role": "model", "parts": ["Here is your plan for tomorrow…"]},
                {"role": "user",  "parts": ["Add a gym session at 6 PM."]},
                {"role": "model", "parts": ["I've added a gym session at 6 PM."]},
            ]

        The current ``prompt`` is appended as the next user turn automatically
        by send_message_async().

        Args:
            prompt:  The current user message.
            history: Prior conversation turns (may be empty for a new session).

        Returns:
            The trimmed text response from the model.

        Raises:
            AgentExecutionError: If the prompt is empty or the Gemini API call fails.
        """
        if not prompt or not prompt.strip():
            raise AgentExecutionError("Prompt cannot be empty.")

        cleaned_prompt = prompt.strip()
        try:
            chat = self._model.start_chat(history=history or [])
            response = await chat.send_message_async(cleaned_prompt)
            if not response or not response.text:
                raise AgentExecutionError("Received empty response from Gemini (chat session).")
            logger.debug(
                "generate_with_history | history_turns=%d | prompt_len=%d",
                len(history),
                len(cleaned_prompt),
            )
            return response.text.strip()
        except AgentExecutionError:
            raise
        except Exception as exc:
            raise AgentExecutionError(
                f"Gemini chat session API call failed: {exc}"
            ) from exc

