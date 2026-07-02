import logging
from typing import Dict, Any, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from app.firebase.firebase import get_firebase_app
from app.schemas.user import AuthUser

logger = logging.getLogger(__name__)

# Security scheme helper to auto-extract Bearer token from headers
security_scheme = HTTPBearer(auto_error=False)

def verify_firebase_token(token: str) -> Dict[str, Any]:
    """
    Verify Firebase ID token using the Firebase Admin SDK.
    Handles Expired, Invalid tokens, and other runtime exceptions, raising 401 Unauthorized.
    """
    # Ensure Firebase Admin SDK is initialized before verification
    app = get_firebase_app()
    if not app:
        logger.error("Firebase Admin SDK is not initialized. Token verification failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is currently unavailable."
        )

    try:
        # verify_id_token validates signature, expiration, audience, issuer, etc.
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except auth.ExpiredIdTokenError as e:
        logger.warning(f"Firebase token expired: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.InvalidIdTokenError as e:
        logger.warning(f"Firebase token signature/structure invalid: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Error during Firebase ID token verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> AuthUser:
    """
    FastAPI dependency to protect backend endpoints.
    Extracts the Bearer token from the Authorization header, verifies it, 
    and returns a structured AuthUser validation schema instance.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials are required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    # verify_firebase_token will raise 401 if validation fails
    decoded_token = verify_firebase_token(token)
    
    uid = decoded_token.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token payload (missing uid).",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return AuthUser(
        uid=uid,
        email=decoded_token.get("email"),
        name=decoded_token.get("name"),
        picture=decoded_token.get("picture"),
        email_verified=decoded_token.get("email_verified", False)
    )
