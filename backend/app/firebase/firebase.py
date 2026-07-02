import os
import json
import logging
from typing import Any, Dict, List, Optional
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore import Client
from app.core.config import settings

logger = logging.getLogger(__name__)

# Module-level variables to hold singleton instances
_firebase_app = None
_db: Optional[Client] = None

def get_firebase_app():
    """
    Initializes and returns the singleton Firebase app instance.
    Guarantees initialization happens only once.
    """
    global _firebase_app
    
    if _firebase_app is not None:
        return _firebase_app
        
    # Check if firebase_admin has already initialized an app externally
    if firebase_admin._apps:
        _firebase_app = firebase_admin.get_app()
        logger.info("Retrieved already initialized Firebase App.")
        return _firebase_app

    # Attempt initialization using environment variables in priority order
    cred = None
    
    # 1. Check for raw JSON string in environment variables
    if settings.FIREBASE_CREDENTIALS_JSON:
        try:
            cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
            cred = credentials.Certificate(cred_dict)
            logger.info("Loaded Firebase credentials from JSON env variable.")
        except Exception as e:
            logger.error(f"Failed to parse FIREBASE_CREDENTIALS_JSON: {str(e)}")

    # 2. Check for service account file path
    if not cred and settings.FIREBASE_CREDENTIALS_PATH:
        if os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            try:
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                logger.info(f"Loaded Firebase credentials from file: {settings.FIREBASE_CREDENTIALS_PATH}")
            except Exception as e:
                logger.error(f"Failed to load Firebase credentials file at {settings.FIREBASE_CREDENTIALS_PATH}: {str(e)}")
        else:
            logger.warning(f"Firebase credentials file not found at path: {settings.FIREBASE_CREDENTIALS_PATH}")

    # 3. Fallback to Application Default Credentials
    if not cred:
        try:
            cred = credentials.ApplicationDefault()
            logger.info("Using Application Default Credentials for Firebase.")
        except Exception as e:
            logger.warning(f"Could not load Application Default Credentials: {str(e)}")

    # Initialize app if credentials were successfully loaded
    if cred:
        try:
            kwargs = {}
            if settings.FIREBASE_DATABASE_URL:
                kwargs['databaseURL'] = settings.FIREBASE_DATABASE_URL
                
            _firebase_app = firebase_admin.initialize_app(cred, kwargs)
            logger.info("Firebase Admin SDK initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase app: {str(e)}")
            _firebase_app = None
    else:
        logger.error("No valid Firebase credentials could be loaded. Firebase functions will fail.")
        
    return _firebase_app


def get_db() -> Client:
    """
    Returns the initialized Firestore Client.
    Initializes Firebase if it hasn't been initialized yet.
    """
    global _db
    
    if _db is not None:
        return _db
        
    app = get_firebase_app()
    if app is None:
        raise RuntimeError("Firebase has not been initialized. Firestore client is unavailable.")
        
    try:
        _db = firestore.client()
        logger.info("Firestore client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Firestore client: {str(e)}")
        raise RuntimeError(f"Failed to initialize Firestore client: {str(e)}")
        
    return _db


# ==========================================
# Reusable Helper Functions for Firestore Access
# ==========================================

def get_document(collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve a document from a collection by ID.
    Returns the document data dict or None if not found.
    """
    try:
        client = get_db()
        doc_ref = client.collection(collection).document(doc_id)
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict() or {}
            # Expose the document ID in the returned dictionary
            data['id'] = doc.id
            return data
        return None
    except Exception as e:
        logger.error(f"Error reading document {doc_id} from collection {collection}: {str(e)}")
        raise RuntimeError(f"Firestore read error: {str(e)}")


def set_document(collection: str, doc_id: str, data: Dict[str, Any], merge: bool = True) -> None:
    """
    Write or overwrite a document. 
    If merge is True, updates existing fields or creates it if it doesn't exist.
    """
    try:
        client = get_db()
        doc_ref = client.collection(collection).document(doc_id)
        doc_ref.set(data, merge=merge)
    except Exception as e:
        logger.error(f"Error setting document {doc_id} in collection {collection}: {str(e)}")
        raise RuntimeError(f"Firestore write error: {str(e)}")


def update_document(collection: str, doc_id: str, data: Dict[str, Any]) -> None:
    """
    Update specific fields in a document. Fails if document doesn't exist.
    """
    try:
        client = get_db()
        doc_ref = client.collection(collection).document(doc_id)
        doc_ref.update(data)
    except Exception as e:
        logger.error(f"Error updating document {doc_id} in collection {collection}: {str(e)}")
        raise RuntimeError(f"Firestore update error: {str(e)}")


def delete_document(collection: str, doc_id: str) -> None:
    """
    Delete a document by ID.
    """
    try:
        client = get_db()
        doc_ref = client.collection(collection).document(doc_id)
        doc_ref.delete()
    except Exception as e:
        logger.error(f"Error deleting document {doc_id} from collection {collection}: {str(e)}")
        raise RuntimeError(f"Firestore delete error: {str(e)}")


def list_documents(collection: str) -> List[Dict[str, Any]]:
    """
    Retrieve all documents from a collection.
    """
    try:
        client = get_db()
        docs = client.collection(collection).stream()
        result = []
        for doc in docs:
            data = doc.to_dict() or {}
            data['id'] = doc.id
            result.append(data)
        return result
    except Exception as e:
        logger.error(f"Error listing documents from collection {collection}: {str(e)}")
        raise RuntimeError(f"Firestore list error: {str(e)}")


def query_documents(collection: str, field: str, op: str, value: Any) -> List[Dict[str, Any]]:
    """
    Query documents in a collection based on a field filter.
    Example: query_documents("users", "is_active", "==", True)
    """
    try:
        client = get_db()
        query = client.collection(collection).where(field, op, value)
        docs = query.stream()
        result = []
        for doc in docs:
            data = doc.to_dict() or {}
            data['id'] = doc.id
            result.append(data)
        return result
    except Exception as e:
        logger.error(f"Error querying collection {collection} on {field} {op} {value}: {str(e)}")
        raise RuntimeError(f"Firestore query error: {str(e)}")
