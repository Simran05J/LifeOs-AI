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
