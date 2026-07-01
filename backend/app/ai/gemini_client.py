import google.generativeai as genai

from app.config.settings import settings
from app.config.constants import DEFAULT_GEMINI_MODEL
from app.agents.shared.exceptions import AgentExecutionError


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

        Args:
            prompt: The plain-text prompt to send to the model.

        Returns:
            The model's text response as a string.

        Raises:
            AgentExecutionError: If the Gemini API call fails for any reason.
        """
        try:
            response = await self._model.generate_content_async(prompt)
            return response.text
        except Exception as exc:
            raise AgentExecutionError(
                f"Gemini API call failed: {exc}"
            ) from exc
