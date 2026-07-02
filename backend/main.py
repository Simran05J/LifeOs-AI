import logging
from datetime import datetime
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.api.v1.router import api_router
from app.core.middleware import LoggingMiddleware, SecurityHeadersMiddleware, RateLimitMiddleware
from app.core.exceptions import (
    validation_exception_handler,
    http_exception_handler,
    general_exception_handler
)

# Configure structured application logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Lifespan context manager handling startup and shutdown events.
    """
    logger.info("Initializing FastAPI Backend application...")
    
    # Eagerly initialize Firebase Admin connection on startup
    try:
        from app.firebase.firebase import get_firebase_app
        get_firebase_app()
        logger.info("Firebase Admin initialized during application startup.")
    except Exception as e:
        logger.error(f"Startup Firebase connection check failed: {str(e)}")
        
    yield
    
    logger.info("FastAPI Backend application is shutting down...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    debug=settings.DEBUG,
    lifespan=lifespan
)

# 1. Register security headers, logging & rate-limiting middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

# 2. CORS configuration (loaded from settings configuration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Register global exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# 4. Mount api routers
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", status_code=status.HTTP_200_OK)
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "environment": settings.APP_ENV,
        "status": "online"
    }

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Production-ready health check endpoint verifying database connectivity.
    """
    firebase_status = "healthy"
    try:
        from app.firebase.firebase import get_db
        # Simply fetching db reference checks if initialized
        get_db()
    except Exception as e:
        firebase_status = f"unhealthy: {str(e)}"
        
    return {
        "status": "healthy" if "unhealthy" not in firebase_status else "unhealthy",
        "services": {
            "firebase": firebase_status
        },
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
