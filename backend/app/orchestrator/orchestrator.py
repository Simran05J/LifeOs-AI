from app.agents.shared.models import AgentRequest, AgentResponse


class AntigravityOrchestrator:
    """
    Central orchestrator responsible for receiving agent requests and
    routing them to the appropriate AI agent.

    Routing logic will be implemented in a later phase.
    """

    async def route_request(self, request: AgentRequest) -> AgentResponse:
        """
        Receive an AgentRequest and route it to the appropriate agent.

        TODO: Implement intent detection and agent routing in a later phase.
        """
        raise NotImplementedError("Agent routing has not been implemented yet.")
