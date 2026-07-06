import logging
import re
import uuid
from datetime import datetime
from app.schemas.chat import ChatRequest, ChatResponse
from app.orchestrator.orchestrator import AntigravityOrchestrator
from app.agents.shared.models import AgentRequest, AgentResponse
from app.agents.shared.exceptions import AgentValidationError, AgentExecutionError
from app.services.session_service import session_service

logger = logging.getLogger(__name__)

# Instantiate the AntigravityOrchestrator singleton
orchestrator = AntigravityOrchestrator()


# ---------------------------------------------------------------------------
# Payload extraction helpers
# ---------------------------------------------------------------------------

_BUDGET_RE = re.compile(
    r"""(?:under|within|budget|of|for|with|around)?\s*
        (?:rs\.?|inr|₹|\$|usd)?\s*
        ([\d,]+(?:\.\d{1,2})?)\s*
        (?:rs\.?|inr|₹|\$|usd|thousand|k|lakh|lac)?\s*
        (?:rupees?|dollars?)?\b""",
    re.IGNORECASE | re.VERBOSE,
)

# Common destination keywords to extract from travel messages
_KNOWN_DESTINATIONS = [
    "goa", "delhi", "mumbai", "bangalore", "bengaluru", "hyderabad",
    "chennai", "kolkata", "jaipur", "agra", "kerala", "manali",
    "shimla", "rishikesh", "varanasi", "pune", "ahmedabad",
    "paris", "london", "dubai", "singapore", "bangkok", "new york",
    "tokyo", "bali", "sydney", "rome", "barcelona", "amsterdam",
]


def _extract_destination(message: str) -> str:
    """Return the first recognizable destination found in the message, else 'Not specified'."""
    lower = message.lower()
    for dest in _KNOWN_DESTINATIONS:
        if dest in lower:
            # Return title-cased canonical name
            return dest.title()
    # Fallback: look for pattern like 'to <City>' or 'in <City>'
    match = re.search(r"\b(?:to|in|visit|visiting|for|at)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)", message)
    if match:
        return match.group(1)
    return "Not specified"


def _extract_budget(message: str) -> float:
    """Return the first numeric budget found in the message, else 20000.0 as default."""
    match = _BUDGET_RE.search(message)
    if match:
        raw = match.group(1).replace(",", "")
        try:
            value = float(raw)
            # Handle shorthand like '20k' → 20000
            lower = message.lower()
            if re.search(r"\b" + re.escape(raw.split(".")[0]) + r"\s*(?:k|thousand)\b", lower):
                value *= 1000
            elif re.search(r"\b" + re.escape(raw.split(".")[0]) + r"\s*(?:lakh|lac)\b", lower):
                value *= 100_000
            return max(value, 1.0)  # must be positive
        except ValueError:
            pass
    return 20_000.0  # sensible default


class ChatService:
    @staticmethod
    async def process_chat_message(request: ChatRequest, user_id: str) -> ChatResponse:
        """
        Accepts user chat messages, maps them to an AgentRequest,
        forwards them to the AntigravityOrchestrator, and returns the response mapped to ChatResponse.

        Session continuity:
          1. If a session_id is supplied and known, its conversation history is retrieved
             from SessionService and injected into the agent payload.
          2. If no session_id is supplied (or the session has expired), a fresh session is
             created and the conversation starts clean.
          3. After a successful response, the user↔model turn is persisted back to the session
             so subsequent requests carry the full accumulated context.
        """
        logger.info("Processing chat message for user_id: %s", user_id)
        logger.debug(
            "Message content: '%s' | Incoming session_id: %s",
            request.message,
            request.session_id,
        )

        # ── Step 1: Resolve session ───────────────────────────────────────────
        incoming_sid = request.session_id
        session_id = None
        conversation_history = []

        if incoming_sid:
            if session_service.session_exists(incoming_sid):
                session_id = incoming_sid
                conversation_history = session_service.get_history(session_id)
                logger.info(
                    "Session RESUMED  | session_id=%s | history_turns=%d",
                    session_id,
                    len(conversation_history),
                )
            else:
                # Session not in memory. Try restoring from Firestore.
                from app.firebase.firebase import get_db
                db = get_db()
                session_ref = db.collection("users").document(user_id).collection("chat_sessions").document(incoming_sid)
                try:
                    session_doc = session_ref.get()
                except Exception as err:
                    logger.error("Failed to query chat session %s from Firestore: %s", incoming_sid, err)
                    session_doc = None

                if session_doc and session_doc.exists:
                    # Session exists in Firestore! Recreate in-process session.
                    session_id = session_service.create_session(
                        user_id=user_id,
                        session_id=incoming_sid,
                    )
                    # Load messages subcollection ordered by timestamp asc
                    try:
                        messages_stream = session_ref.collection("messages").order_by("timestamp", direction="ASCENDING").stream()
                        for m in messages_stream:
                            m_data = m.to_dict()
                            sender = m_data.get("sender") or m_data.get("role")
                            text = m_data.get("message") or m_data.get("content") or ""
                            if sender == "user":
                                session_service._sessions[session_id]["history"].append({"role": "user", "parts": [text]})
                            elif sender in ("assistant", "model"):
                                session_service._sessions[session_id]["history"].append({"role": "model", "parts": [text]})
                    except Exception as err:
                        logger.error("Failed to load messages for session %s from Firestore: %s", incoming_sid, err)

                    conversation_history = session_service.get_history(session_id)
                    logger.info(
                        "Session RESTORED from Firestore | session_id=%s | history_turns=%d",
                        session_id,
                        len(conversation_history),
                    )
                else:
                    # Creating new session because it doesn't exist in Firestore
                    session_id = session_service.create_session(
                        user_id=user_id,
                        session_id=incoming_sid,
                    )
                    conversation_history = []
                    logger.info("Session NEW (expired/unknown id) | session_id=%s | user_id=%s", session_id, user_id)
        else:
            # No incoming session_id - create brand new session
            session_id = session_service.create_session(user_id=user_id)
            conversation_history = []
            logger.info("Session NEW (no id) | session_id=%s | user_id=%s", session_id, user_id)

        # ── Step 2: Build AgentRequest ────────────────────────────────────────
        # local_time is sent as a naive ISO string (no Z / offset) representing the
        # user's actual wall-clock time. Parse it as a naive datetime so the AI
        # receives the correct local context (e.g. 00:40 IST, not 19:10 UTC).
        timezone_str = getattr(request, 'timezone', 'UTC') or 'UTC'
        locale_str   = getattr(request, 'locale',   'en-IN') or 'en-IN'

        if getattr(request, 'local_time', None):
            try:
                # Strip any trailing Z or offset – the value is already local wall-clock
                raw = request.local_time.rstrip('Z')
                raw = raw.split('+')[0].split('-')[0] if 'T' in raw else raw
                # Re-split properly: remove offset after the time part
                if 'T' in request.local_time:
                    date_part, time_part = request.local_time.split('T', 1)
                    time_part = time_part.split('+')[0].split('Z')[0]
                    raw = f"{date_part}T{time_part}"
                current_time = datetime.fromisoformat(raw)
            except Exception:
                current_time = datetime.utcnow()
        else:
            current_time = datetime.utcnow()

        today = current_time.date()

        # Build a rich, unambiguous time context string that every AI agent can
        # reference so relative phrases ('tomorrow', 'in 10 minutes') are resolved
        # using the user's LOCAL time — never server UTC.
        day_names = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
        month_names = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December']
        weekday_name = day_names[current_time.weekday()]
        month_name   = month_names[current_time.month - 1]
        hour_12      = current_time.hour % 12 or 12
        ampm         = 'AM' if current_time.hour < 12 else 'PM'
        time_context = (
            f"User's current local time: {weekday_name}, {current_time.day} {month_name} {current_time.year}, "
            f"{hour_12}:{current_time.minute:02d} {ampm} ({timezone_str}). "
            f"Today's date is {current_time.strftime('%Y-%m-%d')}. "
            f"All dates/times you output MUST be in this local timezone, not UTC."
        )

        agent_request = AgentRequest(
            user_id=user_id,
            agent="chat",
            payload={
                "query": request.message,
                "user_message": request.message,
                "session_id": session_id,
                "conversation_history": conversation_history,
                "current_time": current_time,
                "time_context": time_context,
                "timezone": timezone_str,
                "locale": locale_str,
                "target_date": today,
                "start_date": today,
                "end_date": today,
                "destination": _extract_destination(request.message),
                "budget": _extract_budget(request.message),
                "expense_records": [],
                "existing_tasks": [],
            },
        )

        # ── Step 3: Execute via Orchestrator ──────────────────────────────────
        try:
            logger.info("Forwarding request to the Antigravity Orchestrator...")
            agent_response: AgentResponse = await orchestrator.execute(agent_request)

            # Map AgentResponse back to ChatResponse: extract the detailed summary if available,
            # otherwise fall back to the outer agent message.
            response_text = None
            if agent_response.data:
                if "summary" in agent_response.data:
                    response_text = agent_response.data["summary"]
                elif "responses" in agent_response.data and isinstance(
                    agent_response.data["responses"], list
                ):
                    summaries = []
                    for resp in agent_response.data["responses"]:
                        if isinstance(resp, dict) and "summary" in resp:
                            summaries.append(resp["summary"])
                    if summaries:
                        response_text = " | ".join(summaries)

            if not response_text:
                response_text = agent_response.message or "Request processed successfully."

            logger.info("Successfully received response from Antigravity Orchestrator.")

            # Execute side effects inside the Service Layer
            actions = []
            if agent_response.success:
                if ", " in agent_response.agent:
                    # Multi-agent response
                    agents = agent_response.agent.split(", ")
                    responses_data = (agent_response.data or {}).get("responses") or []
                    for idx, agent_name in enumerate(agents):
                        if idx < len(responses_data):
                            data_item = responses_data[idx]
                            res_actions = await ChatService._execute_side_effects(
                                user_id=user_id,
                                agent_name=agent_name,
                                data=data_item,
                                payload=agent_request.payload
                            )
                            actions.extend(res_actions)
                else:
                    # Single-agent response
                    res_actions = await ChatService._execute_side_effects(
                        user_id=user_id,
                        agent_name=agent_response.agent,
                        data=agent_response.data,
                        payload=agent_request.payload
                    )
                    actions.extend(res_actions)

            # ── Step 4: Persist turn to session ──────────────────────────────
            session_service.append_turn(
                session_id=session_id,
                user_text=request.message,
                model_text=response_text,
            )
            logger.info(
                "Session SAVED    | session_id=%s | turn appended successfully.", session_id
            )

            # Generate a session title if this is the first turn
            session_title = None
            if not conversation_history:
                try:
                    title_prompt = (
                        "Generate a very short, clean title (2 to 4 words maximum, no quotes, no explanation, no prefixes) "
                        f"summarizing this user query: '{request.message}'"
                    )
                    session_title = await orchestrator._reasoning_engine.reason(title_prompt)
                    session_title = session_title.strip().strip('"').strip("'").strip("Title:").strip()
                    # Clean up trailing punctuation
                    session_title = re.sub(r'[.\s]+$', '', session_title)
                    logger.info("Generated chat session title: %s", session_title)
                except Exception as e:
                    logger.warning("Failed to generate chat session title: %s", e)

            return ChatResponse(
                message=response_text,
                session_id=session_id,
                response_id=str(uuid.uuid4()),
                created_at=datetime.utcnow(),
                actions_executed=actions if actions else None,
                session_title=session_title
            )


        except AgentValidationError as exc:
            logger.warning(
                "Agent validation error while processing chat message for user %s: %s",
                user_id,
                exc,
            )
            raise
        except AgentExecutionError as exc:
            logger.error(
                "Agent execution error while processing chat message for user %s: %s",
                user_id,
                exc,
                exc_info=True,
            )
            raise
        except Exception as exc:
            logger.error(
                "Unexpected error in ChatService for user %s: %s", user_id, exc, exc_info=True
            )
            raise AgentExecutionError(f"Unexpected chat service error: {exc}") from exc

    @staticmethod
    async def delete_chat_session(session_id: str, user_id: str) -> None:
        """
        Delete a chat session from Firestore and the local in-process session cache.
        Ensures ownership validation.
        """
        logger.info("Deleting chat session %s for user %s", session_id, user_id)
        from app.firebase.firebase import get_db

        db = get_db()

        # 1. Direct point-lookup to verify if the session belongs to the current user
        session_ref = db.collection("users").document(user_id).collection("chat_sessions").document(session_id)
        session_doc = session_ref.get()

        if not session_doc.exists:
            # 2. Check if the session exists under any user to distinguish between 403 and 404
            found = False
            users = db.collection("users").stream()
            for u in users:
                if u.id == user_id:
                    continue
                other_ref = db.collection("users").document(u.id).collection("chat_sessions").document(session_id)
                if other_ref.get().exists:
                    found = True
                    break
            
            if found:
                logger.warning("Unauthorized delete attempt by user %s on session %s", user_id, session_id)
                raise PermissionError("Access denied: You do not own this conversation.")
            else:
                logger.warning("Chat session %s not found in Firestore.", session_id)
                raise ValueError("Conversation not found")

        # 3. Perform recursive delete on the session document (deletes the document and all subcollections)
        try:
            db.recursive_delete(session_ref)
            logger.info("Successfully deleted chat session document and nested messages in Firestore.")
        except Exception as e:
            logger.error("Failed to recursively delete chat session %s from Firestore: %s", session_id, str(e))
            raise RuntimeError(f"Firestore delete failed: {str(e)}")

        # 4. Remove from in-process session cache
        session_service.delete_session(session_id)
        logger.info("Successfully cleared chat session %s from in-process memory cache.", session_id)

    @staticmethod
    async def _execute_side_effects(user_id: str, agent_name: str, data: dict, payload: dict) -> list[dict]:
        """
        Execute backend CRUD database operations matching the AI intent result.
        Returns a list of structured action descriptions representing the executed operations.
        """
        actions = []
        if not data:
            return actions

        try:
            actions_list = data.get("actions") or []
            if actions_list:
                for act in actions_list:
                    action_type = act.get("action")
                    entity_type = act.get("entity_type")
                    entity_id = act.get("entity_id")
                    act_data = act.get("data") or {}

                    if entity_type == "reminder":
                        from app.services.reminder_service import ReminderService
                        from app.schemas.reminder import ReminderCreate, ReminderUpdate, ReminderPriority
                        from datetime import datetime
                        if action_type == "create":
                            time_str = act_data.get("remind_at") or act_data.get("time")
                            if isinstance(time_str, str):
                                try:
                                    clean_time = time_str.split('+')[0].split('Z')[0]
                                    remind_at = datetime.fromisoformat(clean_time)
                                except ValueError:
                                    remind_at = datetime.utcnow()
                            else:
                                remind_at = time_str or datetime.utcnow()
                            reminder_create = ReminderCreate(
                                title=act_data.get("title") or "New Reminder",
                                description=act_data.get("description") or "",
                                remind_at=remind_at,
                                priority=ReminderPriority(act_data.get("priority", "medium").lower()) if act_data.get("priority") in [p.value for p in ReminderPriority] else ReminderPriority.MEDIUM,
                                is_completed=act_data.get("is_completed", False)
                            )
                            created_rem = await ReminderService.create_reminder(user_id, reminder_create)
                            actions.append({
                                "action": "create",
                                "entity_type": "reminder",
                                "entity_id": created_rem.id,
                                "title": created_rem.title,
                                "time": created_rem.remind_at.isoformat(),
                                "source": "ai"
                            })
                        elif action_type == "update" and entity_id:
                            update_payload = {}
                            if "title" in act_data:
                                update_payload["title"] = act_data["title"]
                            if "description" in act_data:
                                update_payload["description"] = act_data["description"]
                            if "remind_at" in act_data or "time" in act_data:
                                time_str = act_data.get("remind_at") or act_data.get("time")
                                if isinstance(time_str, str):
                                    try:
                                        clean_time = time_str.split('+')[0].split('Z')[0]
                                        update_payload["remind_at"] = datetime.fromisoformat(clean_time)
                                    except ValueError:
                                        pass
                            if "priority" in act_data:
                                p_val = act_data["priority"]
                                if p_val in [p.value for p in ReminderPriority]:
                                    update_payload["priority"] = ReminderPriority(p_val.lower())
                            if "is_completed" in act_data:
                                update_payload["is_completed"] = act_data["is_completed"]
                                update_payload["completed"] = act_data["is_completed"]
                            if "completed" in act_data:
                                update_payload["is_completed"] = act_data["completed"]
                                update_payload["completed"] = act_data["completed"]

                            reminder_update = ReminderUpdate(**update_payload)
                            updated_rem = await ReminderService.update_reminder(user_id, entity_id, reminder_update)
                            actions.append({
                                "action": "update",
                                "entity_type": "reminder",
                                "entity_id": updated_rem.id,
                                "title": updated_rem.title,
                                "time": updated_rem.remind_at.isoformat(),
                                "source": "ai"
                            })
                        elif action_type == "delete" and entity_id:
                            await ReminderService.delete_reminder(user_id, entity_id)
                            actions.append({
                                "action": "delete",
                                "entity_type": "reminder",
                                "entity_id": entity_id,
                                "source": "ai"
                            })

                    elif entity_type == "task":
                        from app.services.task_service import TaskService
                        from app.schemas.task import TaskCreate, TaskUpdate, TaskPriority, TaskStatus
                        from datetime import datetime
                        if action_type == "create":
                            due_date_str = act_data.get("due_date")
                            due_date = None
                            if due_date_str:
                                try:
                                    clean_due = due_date_str.split('+')[0].split('Z')[0]
                                    due_date = datetime.fromisoformat(clean_due)
                                except ValueError:
                                    pass
                            priority_val = act_data.get("priority", "medium").lower()
                            status_val = act_data.get("status", "todo").lower()
                            task_create = TaskCreate(
                                title=act_data.get("title") or "New Task",
                                description=act_data.get("description") or "",
                                due_date=due_date,
                                priority=TaskPriority(priority_val) if priority_val in [tp.value for tp in TaskPriority] else TaskPriority.MEDIUM,
                                status=TaskStatus(status_val) if status_val in [ts.value for ts in TaskStatus] else TaskStatus.TODO,
                                tags=act_data.get("tags") or []
                            )
                            created_task = await TaskService.create_task(user_id, task_create)
                            actions.append({
                                "action": "create",
                                "entity_type": "task",
                                "entity_id": created_task.id,
                                "title": created_task.title,
                                "source": "ai"
                            })
                        elif action_type == "update" and entity_id:
                            update_payload = {}
                            if "title" in act_data:
                                update_payload["title"] = act_data["title"]
                            if "description" in act_data:
                                update_payload["description"] = act_data["description"]
                            if "due_date" in act_data:
                                due_date_str = act_data["due_date"]
                                if due_date_str:
                                    try:
                                        clean_due = due_date_str.split('+')[0].split('Z')[0]
                                        update_payload["due_date"] = datetime.fromisoformat(clean_due)
                                    except ValueError:
                                        pass
                            if "priority" in act_data:
                                priority_val = act_data["priority"].lower()
                                if priority_val in [tp.value for tp in TaskPriority]:
                                    update_payload["priority"] = TaskPriority(priority_val)
                            if "status" in act_data:
                                status_val = act_data["status"].lower()
                                if status_val in [ts.value for ts in TaskStatus]:
                                    update_payload["status"] = TaskStatus(status_val)
                            if "tags" in act_data:
                                update_payload["tags"] = act_data["tags"]

                            task_update = TaskUpdate(**update_payload)
                            updated_task = await TaskService.update_task(user_id, entity_id, task_update)
                            actions.append({
                                "action": "update",
                                "entity_type": "task",
                                "entity_id": updated_task.id,
                                "title": updated_task.title,
                                "source": "ai"
                            })
                        elif action_type == "delete" and entity_id:
                            await TaskService.delete_task(user_id, entity_id)
                            actions.append({
                                "action": "delete",
                                "entity_type": "task",
                                "entity_id": entity_id,
                                "source": "ai"
                            })

                    elif entity_type in ["expense", "finance"]:
                        from app.services.finance_service import FinanceService
                        from datetime import datetime
                        if action_type == "create":
                            amount = float(act_data.get("amount") or 0)
                            category = act_data.get("category") or "General"
                            description = act_data.get("description") or ""
                            payment_method = act_data.get("payment_method") or "cash"
                            date_str = act_data.get("transaction_date") or act_data.get("transactionDate")
                            tx_date = None
                            if date_str:
                                try:
                                    clean_date = date_str.split('+')[0].split('Z')[0]
                                    tx_date = datetime.fromisoformat(clean_date)
                                except ValueError:
                                    pass
                            if not tx_date:
                                tx_date = datetime.utcnow()
                            if amount > 0:
                                created_exp = FinanceService.create_expense(
                                    user_id=user_id,
                                    amount=amount,
                                    category=category,
                                    description=description,
                                    payment_method=payment_method,
                                    transaction_date=tx_date
                                )
                                actions.append({
                                    "action": "create",
                                    "entity_type": "expense",
                                    "entity_id": created_exp["id"],
                                    "title": f"Logged expense ₹{amount} for {category}",
                                    "amount": amount,
                                    "category": category,
                                    "source": "ai"
                                })
                        elif action_type == "update" and entity_id:
                            update_payload = {}
                            if "amount" in act_data:
                                update_payload["amount"] = float(act_data["amount"])
                            if "category" in act_data:
                                update_payload["category"] = act_data["category"]
                            if "description" in act_data:
                                update_payload["description"] = act_data["description"]
                                update_payload["title"] = act_data["description"]
                                update_payload["note"] = act_data["description"]
                            if "payment_method" in act_data:
                                update_payload["payment_method"] = act_data["payment_method"]
                            if "transaction_date" in act_data or "transactionDate" in act_data:
                                date_str = act_data.get("transaction_date") or act_data.get("transactionDate")
                                if date_str:
                                    try:
                                        clean_date = date_str.split('+')[0].split('Z')[0]
                                        update_payload["transactionDate"] = datetime.fromisoformat(clean_date)
                                        update_payload["transaction_date"] = datetime.fromisoformat(clean_date)
                                    except ValueError:
                                        pass
                            updated_exp = FinanceService.update_expense(user_id, entity_id, update_payload)
                            actions.append({
                                "action": "update",
                                "entity_type": "expense",
                                "entity_id": entity_id,
                                "title": f"Updated expense: {updated_exp.get('category')}",
                                "source": "ai"
                            })
                        elif action_type == "delete" and entity_id:
                            FinanceService.delete_expense(user_id, entity_id)
                            actions.append({
                                "action": "delete",
                                "entity_type": "expense",
                                "entity_id": entity_id,
                                "source": "ai"
                            })

                    elif entity_type in ["trip", "travel"]:
                        from app.services.travel_service import TravelService
                        from datetime import datetime, timedelta
                        if action_type == "create":
                            destination = act_data.get("destination")
                            if destination:
                                budget = float(act_data.get("budget") or 20000.0)
                                start_date_str = act_data.get("start_date") or act_data.get("startDate")
                                end_date_str = act_data.get("end_date") or act_data.get("endDate")
                                start_dt = datetime.utcnow()
                                end_dt = datetime.utcnow() + timedelta(days=3)
                                if start_date_str:
                                    try:
                                        start_dt = datetime.fromisoformat(start_date_str.split('T')[0])
                                    except ValueError:
                                        pass
                                if end_date_str:
                                    try:
                                        end_dt = datetime.fromisoformat(end_date_str.split('T')[0])
                                    except ValueError:
                                        pass
                                created_trip = TravelService.create_trip(
                                    user_id=user_id,
                                    destination=destination,
                                    budget=budget,
                                    start_date=start_dt,
                                    end_date=end_dt,
                                    itinerary=act_data.get("itinerary") or [],
                                    packing_list=act_data.get("packing_list") or []
                                )
                                actions.append({
                                    "action": "create",
                                    "entity_type": "trip",
                                    "entity_id": created_trip["id"],
                                    "title": f"Planned trip to {destination}",
                                    "source": "ai"
                                })
                        elif action_type == "update" and entity_id:
                            update_payload = {}
                            for field in ["destination", "budget", "itinerary", "packing_list", "status", "startDate", "start_date", "endDate", "end_date"]:
                                if field in act_data:
                                    update_payload[field] = act_data[field]
                            updated_trip = TravelService.update_trip(user_id, entity_id, update_payload)
                            actions.append({
                                "action": "update",
                                "entity_type": "trip",
                                "entity_id": entity_id,
                                "title": f"Updated trip to {updated_trip.get('destination')}",
                                "source": "ai"
                            })
                        elif action_type == "delete" and entity_id:
                            TravelService.delete_trip(user_id, entity_id)
                            actions.append({
                                "action": "delete",
                                "entity_type": "trip",
                                "entity_id": entity_id,
                                "source": "ai"
                            })

                    elif entity_type == "wellness":
                        from app.services.wellness_service import WellnessService
                        if action_type == "create":
                            category = act_data.get("category")
                            amount = float(act_data.get("amount") or act_data.get("current") or 0.0)
                            unit = act_data.get("unit") or ""
                            title = act_data.get("title") or ""
                            
                            if category and amount > 0:
                                updated_goal = WellnessService.log_wellness_activity(
                                    user_id=user_id,
                                    category=category,
                                    amount=amount,
                                    unit=unit,
                                    title=title
                                )
                                actions.append({
                                    "action": "create",
                                    "entity_type": "wellness",
                                    "entity_id": updated_goal["id"],
                                    "title": updated_goal.get("title") or f"Logged {amount} for {category}",
                                    "category": category,
                                    "source": "ai"
                                })
                            else:
                                mood = act_data.get("mood") or payload.get("mood") or "neutral"
                                stress_level = str(act_data.get("stress_level") or payload.get("stress_level") or "medium")
                                recommendations = act_data.get("recommendations") or []
                                created_well = WellnessService.create_wellness_log(
                                    user_id=user_id,
                                    mood=mood,
                                    stress_level=stress_level,
                                    recommendations=recommendations
                                )
                                actions.append({
                                    "action": "create",
                                    "entity_type": "wellness",
                                    "entity_id": created_well["id"],
                                    "title": f"Wellness log: {mood}",
                                    "source": "ai"
                                })
                        elif action_type == "update" and entity_id:
                            update_payload = {}
                            for field in ["title", "category", "target", "current", "unit", "frequency", "status", "notes", "mood", "stress_level", "recommendations"]:
                                if field in act_data:
                                    update_payload[field] = act_data[field]
                            updated_well = WellnessService.update_wellness_log(user_id, entity_id, update_payload)
                            actions.append({
                                "action": "update",
                                "entity_type": "wellness",
                                "entity_id": entity_id,
                                "title": updated_well.get("title") or f"Updated wellness log/goal",
                                "source": "ai"
                            })
                        elif action_type == "delete" and entity_id:
                            WellnessService.delete_wellness_log(user_id, entity_id)
                            actions.append({
                                "action": "delete",
                                "entity_type": "wellness",
                                "entity_id": entity_id,
                                "source": "ai"
                            })
            else:
                # 1. Reminder Agent
                if agent_name == "reminder":
                    title = data.get("reminder_title")
                    time_str = data.get("reminder_time")
                    if title and time_str:
                        from app.services.reminder_service import ReminderService
                        from app.schemas.reminder import ReminderCreate, ReminderPriority
                        from datetime import datetime
                        
                        if isinstance(time_str, str):
                            try:
                                clean_time = time_str.split('+')[0].split('Z')[0]
                                remind_at = datetime.fromisoformat(clean_time)
                            except ValueError:
                                remind_at = datetime.utcnow()
                        else:
                            remind_at = time_str or datetime.utcnow()

                        reminder_create = ReminderCreate(
                            title=title,
                            description=data.get("reminder_description") or "",
                            remind_at=remind_at,
                            priority=ReminderPriority.MEDIUM,
                            is_completed=False
                        )
                        created_rem = await ReminderService.create_reminder(user_id, reminder_create)
                        actions.append({
                            "action": "create",
                            "entity_type": "reminder",
                            "entity_id": created_rem.id,
                            "title": created_rem.title,
                            "time": created_rem.remind_at.isoformat(),
                            "source": "ai"
                        })

                # 2. Planner Agent
                elif agent_name == "planner":
                    generated_plan = data.get("generated_plan") or {}
                    tasks_to_create = generated_plan.get("tasks") or []
                    
                    if tasks_to_create:
                        from app.services.task_service import TaskService
                        from app.schemas.task import TaskCreate, TaskPriority, TaskStatus
                        from datetime import datetime

                        for t in tasks_to_create:
                            due_date_str = t.get("due_date")
                            due_date = None
                            if due_date_str:
                                try:
                                    clean_due = due_date_str.split('+')[0].split('Z')[0]
                                    due_date = datetime.fromisoformat(clean_due)
                                except ValueError:
                                    pass

                            priority_val = t.get("priority", "medium")
                            status_val = t.get("status", "todo")

                            task_create = TaskCreate(
                                title=t.get("title"),
                                description=t.get("description") or "",
                                due_date=due_date,
                                priority=TaskPriority(priority_val) if priority_val in [tp.value for tp in TaskPriority] else TaskPriority.MEDIUM,
                                status=TaskStatus(status_val) if status_val in [ts.value for ts in TaskStatus] else TaskStatus.TODO,
                                tags=t.get("tags") or []
                            )
                            created_task = await TaskService.create_task(user_id, task_create)
                            actions.append({
                                "action": "create",
                                "entity_type": "task",
                                "entity_id": created_task.id,
                                "title": created_task.title,
                                "source": "ai"
                            })

                # 3. Finance Agent
                elif agent_name == "finance":
                    logged_exp = data.get("logged_expense")
                    if logged_exp:
                        from app.services.finance_service import FinanceService
                        from datetime import datetime
                        
                        amount = float(logged_exp.get("amount") or 0)
                        category = logged_exp.get("category") or "General"
                        description = logged_exp.get("description") or ""
                        payment_method = logged_exp.get("payment_method") or "cash"
                        date_str = logged_exp.get("transaction_date")
                        
                        tx_date = None
                        if date_str:
                            try:
                                clean_date = date_str.split('+')[0].split('Z')[0]
                                tx_date = datetime.fromisoformat(clean_date)
                            except ValueError:
                                pass
                        if not tx_date:
                            tx_date = datetime.utcnow()

                        if amount > 0:
                            created_exp = FinanceService.create_expense(
                                user_id=user_id,
                                amount=amount,
                                category=category,
                                description=description,
                                payment_method=payment_method,
                                transaction_date=tx_date
                            )
                            actions.append({
                                "action": "create",
                                "entity_type": "expense",
                                "entity_id": created_exp["id"],
                                "title": f"Logged expense ₹{amount} for {category}",
                                "amount": amount,
                                "category": category,
                                "source": "ai"
                            })

                # 4. Travel Agent
                elif agent_name == "travel":
                    destination = data.get("destination")
                    if destination:
                        from app.services.travel_service import TravelService
                        from datetime import datetime, timedelta
                        
                        budget = float(payload.get("budget") or data.get("estimated_budget", {}).get("total") or 20000.0)
                        
                        start_date = payload.get("start_date") or datetime.utcnow().date()
                        end_date = payload.get("end_date") or (datetime.utcnow() + timedelta(days=3)).date()
                        
                        from datetime import date
                        start_dt = datetime.combine(start_date, datetime.min.time()) if isinstance(start_date, date) else datetime.utcnow()
                        end_dt = datetime.combine(end_date, datetime.max.time()) if isinstance(end_date, date) else datetime.utcnow()

                        created_trip = TravelService.create_trip(
                            user_id=user_id,
                            destination=destination,
                            budget=budget,
                            start_date=start_dt,
                            end_date=end_dt,
                            itinerary=data.get("itinerary") or [],
                            packing_list=data.get("packing_list") or []
                        )
                        actions.append({
                            "action": "create",
                            "entity_type": "trip",
                            "entity_id": created_trip["id"],
                            "title": f"Planned trip to {destination}",
                            "source": "ai"
                        })

                # 5. Wellness Agent
                elif agent_name == "wellness":
                    logged_act = data.get("logged_activity")
                    if logged_act:
                        from app.services.wellness_service import WellnessService
                        category = logged_act.get("category")
                        amount = float(logged_act.get("amount") or logged_act.get("current") or 0.0)
                        unit = logged_act.get("unit") or ""
                        title = logged_act.get("title") or ""
                        
                        if category and amount > 0:
                            updated_goal = WellnessService.log_wellness_activity(
                                user_id=user_id,
                                category=category,
                                amount=amount,
                                unit=unit,
                                title=title
                            )
                            actions.append({
                                "action": "create",
                                "entity_type": "wellness",
                                "entity_id": updated_goal["id"],
                                "title": updated_goal.get("title") or f"Logged {amount} for {category}",
                                "category": category,
                                "source": "ai"
                            })
                    else:
                        mood = payload.get("mood") or "neutral"
                        stress_level = str(payload.get("stress_level") or "medium")
                        recommendations = data.get("recommendations") or []
                        
                        from app.services.wellness_service import WellnessService
                        created_well = WellnessService.create_wellness_log(
                            user_id=user_id,
                            mood=mood,
                            stress_level=stress_level,
                            recommendations=recommendations
                        )
                        actions.append({
                            "action": "create",
                            "entity_type": "wellness",
                            "entity_id": created_well["id"],
                            "title": f"Wellness log: {mood}",
                            "source": "ai"
                        })

        except Exception as exc:
            logger.error(f"Error executing side-effects for agent {agent_name}: {exc}", exc_info=True)

        return actions

