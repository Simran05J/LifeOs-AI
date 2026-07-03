/**
 * LifeOS AI — Authentication Service
 *
 * Responsibilities:
 *  - Initialise Firebase Auth (lazy singleton)
 *  - Google Sign-In via popup (signInWithPopup)
 *  - Retrieve the Firebase ID token
 *  - Persist / clear the token in localStorage under "lifeos_auth_token"
 *
 * The backend Firebase middleware reads the Authorization header using this
 * same token key, so keep the constant name in sync with chatService.ts.
 *
 * NOTE: Firebase config values MUST be set in .env as VITE_FIREBASE_* vars.
 *       Copy .env.example and fill in real values before testing.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
  type UserCredential,
} from 'firebase/auth';

// ---------------------------------------------------------------------------
// Firebase configuration — read from Vite env vars
// ---------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

// ---------------------------------------------------------------------------
// Singleton helpers — initialise once across HMR reloads
// ---------------------------------------------------------------------------

function getFirebaseApp(): FirebaseApp {
  // Avoid re-initialising the app during Vite HMR reloads
  return getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
}

function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

// ---------------------------------------------------------------------------
// Token storage helpers (shared with chatService.ts)
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'lifeos_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Public auth result shape
// ---------------------------------------------------------------------------

export interface AuthResult {
  /** The signed-in Firebase user */
  user: UserCredential['user'];
  /** Short-lived Firebase ID token — pass as Bearer to the backend */
  idToken: string;
}

// ---------------------------------------------------------------------------
// signInWithGoogle
// ---------------------------------------------------------------------------

/**
 * Opens a Google Sign-In popup and returns the authenticated user + ID token.
 *
 * On success the ID token is also persisted to localStorage so that
 * chatService.ts and any future service can pick it up without prop-drilling.
 *
 * @throws {Error} Human-readable error message — safe to display in the UI.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();

  // Request profile + email scopes (default); add more scopes here if needed
  provider.addScope('profile');
  provider.addScope('email');

  let credential: UserCredential;
  try {
    credential = await signInWithPopup(auth, provider);
  } catch (err: unknown) {
    // Map Firebase auth error codes to friendly messages
    const code = (err as { code?: string }).code ?? '';

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error('Sign-in was cancelled. Please try again.');
    }
    if (code === 'auth/popup-blocked') {
      throw new Error(
        'The sign-in popup was blocked by your browser. Please allow popups for this site and try again.',
      );
    }
    if (code === 'auth/network-request-failed') {
      throw new Error('A network error occurred. Please check your connection and try again.');
    }

    // Generic fallback — include the original message for debugging
    const msg = (err as Error).message ?? 'An unknown error occurred during sign-in.';
    throw new Error(`Sign-in failed: ${msg}`);
  }

  // Retrieve the short-lived Firebase ID token
  let idToken: string;
  try {
    idToken = await credential.user.getIdToken();
  } catch {
    throw new Error('Authenticated but failed to retrieve the ID token. Please try again.');
  }

  // Persist token for downstream services
  storeToken(idToken);

  return { user: credential.user, idToken };
}

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

/**
 * Signs the current user out of Firebase and clears the stored token.
 */
export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  try {
    await firebaseSignOut(auth);
  } finally {
    // Always clear local token even if Firebase signOut fails
    clearToken();
  }
}
