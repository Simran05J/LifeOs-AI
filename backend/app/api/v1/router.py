from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, chat, profile, reminders, tasks, settings

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(reminders.router, prefix="/reminders", tags=["reminders"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])

