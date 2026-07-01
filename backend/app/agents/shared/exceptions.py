class AgentError(Exception):
    """Base exception for all AI agent errors."""


class AgentValidationError(AgentError):
    """Raised when an agent receives invalid or malformed input."""


class AgentExecutionError(AgentError):
    """Raised when an agent fails during task execution."""
