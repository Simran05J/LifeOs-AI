import time
import logging
import uuid
from typing import Dict, List
from collections import defaultdict
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log request details, response status codes, 
    and request duration. Adds a unique X-Request-ID header to responses.
    """
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        request_id = str(uuid.uuid4())
        
        # Inject request_id into state for reference in other layers
        request.state.request_id = request_id
        
        client_host = request.client.host if request.client else "Unknown"
        logger.info(
            f"Request Start: {request.method} {request.url.path} "
            f"| RequestID: {request_id} | Client: {client_host}"
        )
        
        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000
            
            # Inject tracking header
            response.headers["X-Request-ID"] = request_id
            
            logger.info(
                f"Request End: {request.method} {request.url.path} "
                f"| RequestID: {request_id} | Status: {response.status_code} "
                f"| Duration: {process_time:.2f}ms"
            )
            return response
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            logger.error(
                f"Request Exception: {request.method} {request.url.path} "
                f"| RequestID: {request_id} | Error: {str(e)} "
                f"| Duration: {process_time:.2f}ms", 
                exc_info=True
            )
            raise


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to inject OWASP-recommended security headers 
    to mitigate common web vulnerabilities.
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    In-memory IP rate limiter. Limits request count per IP address 
    over a moving 60-second window.
    """
    def __init__(self, app):
        super().__init__(app)
        self.history: Dict[str, List[float]] = defaultdict(list)
        self.limit = settings.RATE_LIMIT_PER_MINUTE
        
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Clean up client history older than 60 seconds
        self.history[client_ip] = [t for t in self.history[client_ip] if now - t < 60]
        
        if len(self.history[client_ip]) >= self.limit:
            logger.warning(f"Rate limit exceeded for client IP: {client_ip} | Limit: {self.limit}/min")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "success": False,
                    "error": "rate_limit_exceeded",
                    "detail": "Too many requests. Please slow down and try again later."
                }
            )
            
        self.history[client_ip].append(now)
        return await call_next(request)
