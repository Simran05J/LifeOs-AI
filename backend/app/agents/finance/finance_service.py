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
        existing_expenses = payload.get("expense_records") or []
        expense_records_str = "\n".join(
            [
                f"- ID: {rec.get('id')}, Date: {rec.get('transaction_date') or rec.get('transactionDate')}, Amount: {rec.get('amount')}, Category: {rec.get('category')}, Description: {rec.get('description') or rec.get('title') or 'None'}"
                for rec in existing_expenses
            ]
        ) if existing_expenses else "No transaction records provided."

        time_context = payload.get("time_context") or "Current Date: Unknown"
        timezone_str = payload.get("timezone", "Asia/Kolkata")

        # Construct prompt
        prompt = (
            f"You are the LifeOS AI Finance Agent.\n"
            f"Your job is to manage the user's financial logs (expenses/income). You support CRUD operations (Create, Update, Delete, List).\n"
            f"\n"
            f"--- CURRENT TIME CONTEXT ---\n"
            f"{time_context}\n"
            f"Timezone: {timezone_str}\n"
            f"---\n"
            f"\n"
            f"--- USER'S TRANSACTIONS ---\n"
            f"{expense_records_str}\n"
            f"---\n"
            f"\n"
            f"User Query: \"{validated_request.query}\"\n"
            f"\n"
            f"Analyze this query and respond ONLY with a valid JSON object matching the following structure:\n"
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
            f"  \"summary\": \"A friendly, conversational, and natural response to the user. Summarize any logged, updated, or deleted transactions, or politely ask the user for details (such as amount, category, description) if their query is too vague to act upon.\",\n"
            f"  \"logged_expense\": null,\n"
            f"  \"actions\": [\n"
            f"     {{\n"
            f"        \"action\": \"create\" / \"update\" / \"delete\",\n"
            f"        \"entity_type\": \"expense\",\n"
            f"        \"entity_id\": \"expense-id-if-update-or-delete-else-null\",\n"
            f"        \"data\": {{\n"
            f"            \"amount\": 0.0,\n"
            f"            \"category\": \"CategoryName\",\n"
            f"            \"description\": \"Description of the spent money\",\n"
            f"            \"payment_method\": \"Cash/Card\",\n"
            f"            \"transaction_date\": \"YYYY-MM-DDTHH:MM:SS in local time\"\n"
            f"        }}\n"
            f"     }},\n"
            f"     {{\n"
            f"        \"action\": \"create\",\n"
            f"        \"entity_type\": \"reminder\",\n"
            f"        \"entity_id\": null,\n"
            f"        \"data\": {{\n"
            f"            \"title\": \"Pay Monthly Electricity Bill\",\n"
            f"            \"description\": \"Electricity bill payment deadline reminder\",\n"
            f"            \"time\": \"YYYY-MM-DDTHH:MM:SS\" (in local time),\n"
            f"            \"priority\": \"medium\",\n"
            f"            \"is_completed\": false\n"
            f"        }}\n"
            f"     }}\n"
            f"  ] or null\n"
            f"}}\n"
            f"Do not add any explanations or markdown. Output only raw JSON."
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
                summary=data.get("summary", "Finance analysis completed successfully."),
                logged_expense=data.get("logged_expense"),
                actions=data.get("actions")
            )

        except json.JSONDecodeError:
            # Fallback in case of raw response
            return FinanceResult(
                success=False,
                summary=f"Failed to parse finance JSON response: {raw_response}"
            )
        except Exception as exc:
            raise AgentExecutionError(f"Finance agent execution failed: {exc}") from exc
