from abc import ABC, abstractmethod
from app.agents.shared.models import AgentRequest, AgentResponse


class BaseAgent(ABC):
    """Abstract base class that defines the common interface for all AI agents."""

    def __init__(self, agent_name: str) -> None:
        self.agent_name = agent_name

    @abstractmethod
    async def execute(self, request: AgentRequest) -> AgentResponse:
        """Execute the agent's primary task and return a structured response."""
        ...
