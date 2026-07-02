import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.schemas.common import ErrorResponse

logger = logging.getLogger(__name__)

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Format request schema/validation exceptions into standardized JSON ErrorResponses.
    """
    request_id = getattr(request.state, "request_id", "N/A")
    logger.warning(
        f"Validation Error | RequestID: {request_id} | Route: {request.method} {request.url.path} "
        f"| Errors: {exc.errors()}"
    )
    
    # Standardize output validation dictionary
    errors_list = []
    for error in exc.errors():
        errors_list.append({
            "field": " -> ".join(map(str, error.get("loc", []))),
            "message": error.get("msg"),
            "type": error.get("type")
        })
        
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            success=False,
            error="validation_error",
            detail={
                "message": "The request body or parameters failed validation.",
                "errors": errors_list
            }
        ).model_dump()
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Format FastAPI/Starlette HTTPExceptions into standardized JSON ErrorResponses.
    """
    request_id = getattr(request.state, "request_id", "N/A")
    logger.warning(
        f"HTTP Exception | RequestID: {request_id} | Route: {request.method} {request.url.path} "
        f"| Code: {exc.status_code} | Detail: {exc.detail}"
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            success=False,
            error="http_error",
            detail=exc.detail
        ).model_dump()
    )


async def general_exception_handler(request: Request, exc: Exception):
    """
    Fallback handler to catch all unhandled native Python exceptions, 
    logging full tracebacks and hiding internal error details from clients.
    """
    request_id = getattr(request.state, "request_id", "N/A")
    logger.error(
        f"Unhandled System Exception | RequestID: {request_id} | Route: {request.method} {request.url.path} "
        f"| Error: {str(exc)}", 
        exc_info=True
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            success=False,
            error="internal_server_error",
            detail="An unexpected error occurred on the server. Please try again later."
        ).model_dump()
    )
