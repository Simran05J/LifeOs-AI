import logging
from app.agents.shared.base_agent import BaseAgent
from app.agents.shared.models import AgentRequest, AgentResponse
from app.agents.shared.exceptions import AgentExecutionError
from app.agents.planner.planner_agent import PlannerAgent
from app.agents.reminder.reminder_agent import ReminderAgent
from app.agents.finance.finance_agent import FinanceAgent
from app.agents.travel.travel_agent import TravelAgent
from app.agents.wellness.wellness_agent import WellnessAgent
from app.ai.reasoning_engine import AIReasoningEngine
from app.config.constants import (
    AGENT_PLANNER,
    AGENT_REMINDER,
    AGENT_FINANCE,
    AGENT_TRAVEL,
    AGENT_WELLNESS,
)

logger = logging.getLogger(__name__)

# Sentinel constant for the general-purpose fallback path
_AGENT_GENERAL = "general"


class AntigravityOrchestrator:
    """
    Central orchestrator responsible for receiving agent requests, detecting intent,
    and routing requests to the appropriate AI agent(s).
    """

    def __init__(self) -> None:
        """
        Initialize the orchestrator and populate the private agent registry.
        Instantiates exactly one instance of each agent and one AIReasoningEngine
        for the general-purpose fallback path.
        """
        self.__registry: dict[str, BaseAgent] = {
            AGENT_PLANNER: PlannerAgent(),
            AGENT_REMINDER: ReminderAgent(),
            AGENT_FINANCE: FinanceAgent(),
            AGENT_TRAVEL: TravelAgent(),
            AGENT_WELLNESS: WellnessAgent(),
        }
        # General-purpose fallback — used when no domain keyword is matched
        self._reasoning_engine = AIReasoningEngine()

        # Deterministic keyword mapping for rule-based routing
        self._keyword_map: dict[str, list[str]] = {
            AGENT_REMINDER: [
                "remind", "reminder", "reminders", "alert", "alerts",
                "notify", "notification", "notifications", "alarm", "alarms",
                "don't forget", "dont forget", "set a reminder", "schedule a reminder"
            ],
            AGENT_PLANNER: [
                "plan my day", "plan my tomorrow", "plan tomorrow", "plan my week", 
                "plan my weekend", "plan weekend", "schedule my day", "daily schedule", 
                "time block", "time blocks", "time blocking", "productivity", 
                "routine", "priorities", "priority", "to-do", "todo", "task", "tasks",
                "organize my day", "organise my day", "study"
            ],
            AGENT_FINANCE: [
                "finance", "finances", "financial", "budget", "budgeting",
                "expense", "expenses", "spend", "spending", "spent", "money",
                "cost", "costs", "transaction", "transactions", "saving", "savings",
                "income", "debt", "invest", "investment", "investments", "bill",
                "bills", "payment", "payments", "track my spending", "how much did i spend",
                "monthly expenses", "under ₹", "under rs", "under inr"
            ],
            AGENT_TRAVEL: [
                "travel", "trip", "trips", "journey", "destination", "itinerary",
                "hotel", "hotels", "flight", "flights", "pack", "packing",
                "packing list", "vacation", "holiday", "tour", "tours", "visit",
                "sightseeing", "book tickets", "train tickets", "bus tickets", "goa"
            ],
            AGENT_WELLNESS: [
                "wellness", "mood", "stress", "stressed", "anxiety", "anxious",
                "mental health", "meditate", "meditation", "exercise", "workout",
                "yoga", "breathe", "breathing", "sleep", "tired", "exhausted",
                "relax", "relaxation", "well-being", "wellbeing", "feeling",
                "emotions", "burn out", "burnout", "self care", "self-care"
            ]
        }

    def _detect_all_intents(self, query: str) -> list[str]:
        """
        Detects all matching agent intents from the query, preserving a deterministic
        priority order and avoiding duplicates.

        Args:
            query: The user query string to match.

        Returns:
            An ordered list of canonical agent name strings that matched.

        Raises:
            AgentExecutionError: If no appropriate agents are matched in the query.
        """
        normalized_query = query.lower()
        matched_agents: list[str] = []

        # Deterministic priority order for routing evaluation
        priority_order = [
            AGENT_WELLNESS,
            AGENT_PLANNER,
            AGENT_REMINDER,
            AGENT_TRAVEL,
            AGENT_FINANCE,
        ]

        for agent_name in priority_order:
            keywords = self._keyword_map.get(agent_name, [])
            for kw in keywords:
                if kw in normalized_query:
                    matched_agents.append(agent_name)
                    break  # Stop checking keywords for this agent once matched

        if not matched_agents:
            logger.info(
                "No domain keywords matched for query '%s' — general fallback will be used.",
                query[:80],
            )
            return []  # Empty list signals the general fallback path

        logger.info("Detected intents: %s", matched_agents)
        return matched_agents

    def _detect_intent(self, query: str) -> str:
        """
        Detects a single intent from the query and returns the canonical agent name.
        Uses the first matching agent from the multi-intent detection.

        Args:
            query: The user query string to match.

        Returns:
            The canonical agent name matching the detected intent.

        Raises:
            AgentExecutionError: If no appropriate agent is matched.
        """
        matched = self._detect_all_intents(query)
        return matched[0]

    def _get_agent(self, agent_name: str) -> BaseAgent:
        """
        Safely retrieves an agent from the registry by its canonical name.

        Args:
            agent_name: Canonical name of the agent to retrieve.

        Returns:
            The requested BaseAgent instance.

        Raises:
            AgentExecutionError: If the agent name is unknown or unregistered.
        """
        agent = self.__registry.get(agent_name)
        if not agent:
            raise AgentExecutionError(f"Unknown agent requested: '{agent_name}'.")
        return agent

    def _collect_responses(self, responses: list[AgentResponse]) -> list[AgentResponse]:
        """
        Helper responsible for collecting all successful AgentResponse objects,
        preserving execution order, ignoring duplicates, and skipping failed executions.

        Args:
            responses: A list of candidate AgentResponses.

        Returns:
            An ordered list of successful AgentResponse objects.
        """
        collected: list[AgentResponse] = []
        seen_ids: set[int] = set()

        for resp in responses:
            if resp and resp.success:
                resp_id = id(resp)
                if resp_id not in seen_ids:
                    seen_ids.add(resp_id)
                    collected.append(resp)

        return collected

    async def _handle_general_query(self, request: AgentRequest) -> AgentResponse:
        """
        Fallback handler for queries that do not match any specialist agent's keyword list.
        Uses the AIReasoningEngine directly to produce a helpful conversational response.
        Only the Orchestrator may invoke this — no agent calls another agent.

        Args:
            request: Standardized agent request containing metadata and payload.

        Returns:
            A standardized AgentResponse wrapping the AI's reply.

        Raises:
            AgentExecutionError: If the reasoning engine itself fails.
        """
        payload = request.payload or {}
        query = payload.get("query", "")
        conversation_history: list[dict] = payload.get("conversation_history", []) or []

        system_context = (
            "You are LifeOS AI, a personal life operating system assistant. "
            "You help users with planning, reminders, budgeting, travel, wellness, and productivity. "
            "Be helpful, concise, and friendly. "
            "If the user's request falls within one of your specialist domains "
            "(planning, reminders, finance, travel, wellness), gently guide them "
            "to phrase their request so you can use the right tool."
        )
        full_prompt = f"{system_context}\n\nUser: {query}"

        try:
            if conversation_history:
                raw_response = await self._reasoning_engine.reason_with_history(
                    full_prompt, conversation_history
                )
            else:
                raw_response = await self._reasoning_engine.reason(full_prompt)
        except Exception as exc:
            raise AgentExecutionError(
                f"General fallback reasoning failed: {exc}"
            ) from exc

        return AgentResponse(
            success=True,
            agent=_AGENT_GENERAL,
            data={"summary": raw_response},
            message=raw_response,
        )

    async def execute(self, request: AgentRequest) -> AgentResponse:
        """
        Public entry point for executing agent requests through the orchestrator.
        Delegates the execution to route_request.

        Args:
            request: Standardized agent request containing metadata and payload.

        Returns:
            Standardized agent response containing consolidated execution results.
        """
        session_id = (request.payload or {}).get("session_id", "<no-session>")
        history_len = len((request.payload or {}).get("conversation_history", []))
        logger.info(
            "Orchestrator executing | user_id=%s | agent=%s | session_id=%s | history_entries=%d",
            request.user_id,
            request.agent,
            session_id,
            history_len,
        )
        return await self.route_request(request)

    async def route_request(self, request: AgentRequest) -> AgentResponse:
        """
        Receive an AgentRequest, detect the appropriate agent(s) based on user query,
        execute sequentially, and return the aggregated results.
        Falls back to the general Gemini handler when no domain keyword matches.

        Args:
            request: Standardized agent request containing metadata and payload.

        Returns:
            Standardized agent response containing consolidated execution results.

        Raises:
            AgentExecutionError: If payload or routing fails completely.
        """
        payload = request.payload or {}
        query = payload.get("query")

        if not query:
            raise AgentExecutionError("Request payload is missing the required 'query' field.")

        # 1. Detect matching agent intents (empty list = use general fallback)
        agent_names = self._detect_all_intents(query)

        # 2. General fallback path — no domain keywords matched
        if not agent_names:
            logger.info("Routing request to general fallback handler.")
            return await self._handle_general_query(request)

        # 3. Single-agent path
        if len(agent_names) == 1:
            agent_name = agent_names[0]
            logger.info("Routing request to single agent: '%s'", agent_name)
            agent = self._get_agent(agent_name)
            try:
                response = await agent.execute(request)
                logger.info("Successfully executed single agent: '%s'", agent_name)
                return response
            except Exception as exc:
                logger.error("Single agent '%s' failed to execute: %s", agent_name, exc)
                raise AgentExecutionError(f"Agent '{agent_name}' failed to execute: {exc}") from exc

        # 4. Multi-agent path: Execute sequentially
        logger.info("Routing request to multiple agents sequentially: %s", agent_names)
        responses: list[AgentResponse] = []
        execution_errors: list[Exception] = []

        for agent_name in agent_names:
            logger.info("Executing agent: '%s' in sequence", agent_name)
            try:
                agent = self._get_agent(agent_name)
                response = await agent.execute(request)
                responses.append(response)
                logger.info("Successfully executed agent: '%s'", agent_name)
            except AgentExecutionError as exc:
                logger.error("Agent '%s' failed during execution: %s", agent_name, exc)
                execution_errors.append(exc)
            except Exception as exc:
                logger.exception("Unexpected error occurred while running agent '%s'", agent_name)
                execution_errors.append(
                    AgentExecutionError(f"Agent '{agent_name}' failed to execute: {exc}")
                )

        # 5. Collect successful responses
        successful_responses = self._collect_responses(responses)

        # 6. Fail only if ALL selected agents fail; otherwise return partial success
        if not successful_responses:
            error_details = "; ".join(str(err) for err in execution_errors)
            logger.error("All matched agents failed to execute: %s", error_details)
            raise AgentExecutionError(
                f"All selected agents failed to execute. Details: {error_details}"
            )

        contributing_agents = [resp.agent for resp in successful_responses]
        combined_message = " | ".join(
            resp.message for resp in successful_responses if resp.message
        )

        return AgentResponse(
            success=True,
            agent=", ".join(contributing_agents),
            data={"responses": [resp.data for resp in successful_responses]},
            message=combined_message
        )
