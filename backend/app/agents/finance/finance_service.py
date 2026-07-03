import json
import re
from typing import Any
from app.agents.shared.exceptions import AgentValidationError, AgentExecutionError
from app.ai.reasoning_engine import AIReasoningEngine
from app.agents.finance.models.finance_request import FinanceRequest
from app.agents.finance.models.finance_result import FinanceResult


class FinanceService:
    """
    Service responsible for coordinating finance-related operations.
    Communicates with the AI Reasoning Engine to analyze expense records and generate insights.
    """

    def __init__(self) -> None:
        self.reasoning_engine = AIReasoningEngine()

    async def analyze_finances(self, request: Any) -> FinanceResult:
        """
        Analyzes user financial logs and concerns using the AI reasoning engine,
        producing a structured FinanceResult.

        Args:
            request: The request payload (either FinanceRequest instance or dictionary).

        Returns:
            The structured FinanceResult containing parsed insights.

        Raises:
            AgentValidationError: If input validation fails.
            AgentExecutionError: If AI reasoning or parsing fails.
        """
        # Validate request
        try:
            if hasattr(request, "dict"):
                payload = request.dict()
            elif isinstance(request, dict):
                payload = request
            else:
                raise ValueError("Unsupported request format.")

            validated_request = FinanceRequest(**payload)
        except Exception as exc:
            raise AgentValidationError(f"Invalid finance request: {exc}") from exc

        # Format expense records for the prompt
        expense_records_str = "\n".join(
            [
                f"- Date: {rec.date}, Amount: {rec.amount}, Category: {rec.category}, Merchant: {rec.merchant or 'N/A'}, Description: {rec.description or 'None'}"
                for rec in validated_request.expense_records
            ]
        ) if validated_request.expense_records else "No transaction records provided."

        # Construct prompt
        prompt = (
            f"You are the LifeOS AI Finance Agent.\n"
            f"Your job is to analyze the user's spending habits, answer their query, and suggest a budget.\n"
            f"User Query: \"{validated_request.query}\"\n\n"
            f"Here are the user's transactions:\n"
            f"{expense_records_str}\n\n"
            f"Analyze this data and respond ONLY with a valid JSON object matching the following structure:\n"
            f"{{\n"
            f"  \"success\": true,\n"
            f"  \"expense_summary\": {{\n"
            f"    \"total_spent\": 0.0,\n"
            f"    \"category_breakdown\": {{\n"
            f"       \"CategoryName\": 0.0\n"
            f"    }}\n"
            f"  }},\n"
            f"  \"budget_recommendations\": [\"Tip 1\", \"Tip 2\"],\n"
            f"  \"spending_insights\": [\"Insight 1\", \"Insight 2\"],\n"
            f"  \"summary\": \"Detailed analysis summary explaining the spending patterns.\"\n"
            f"}}\n"
            f"Do not add any explanations, markdown code blocks, or extra text. Output only raw JSON."
        )

        try:
            # Call AIReasoningEngine
            raw_response = await self.reasoning_engine.reason(prompt)

            # Clean and parse JSON response
            json_text = raw_response.strip()
            if json_text.startswith("```"):
                match = re.search(r"```(?:json)?\s*(.*?)\s*```", json_text, re.DOTALL)
                if match:
                    json_text = match.group(1)

            data = json.loads(json_text)

            return FinanceResult(
                success=data.get("success", True),
                expense_summary=data.get("expense_summary", {}),
                budget_recommendations=data.get("budget_recommendations", []),
                spending_insights=data.get("spending_insights", []),
                summary=data.get("summary", "Finance analysis completed successfully.")
            )

        except json.JSONDecodeError:
            # Fallback in case of raw response
            return FinanceResult(
                success=False,
                summary=f"Failed to parse finance JSON response: {raw_response}"
            )
        except Exception as exc:
            raise AgentExecutionError(f"Finance agent execution failed: {exc}") from exc
