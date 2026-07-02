from app.firebase.firebase import get_db, get_firebase_app

# Expose db and firebase_app for simple references
try:
    db = get_db()
except Exception:
    db = None

firebase_app = get_firebase_app()

