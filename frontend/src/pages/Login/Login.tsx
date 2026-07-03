/**
 * LifeOS AI — Login Page
 *
 * Full-screen Google-only authentication entry screen.
 * Design: dark theme, violet/purple glassmorphism cards — consistent with
 * the existing dashboard (AppLayout, global.css, tailwind.config.js).
 *
 * Auth flow:
 *   1. User clicks "Continue with Google"
 *   2. Firebase Google popup opens → signInWithGoogle()
 *   3. On success → ID token stored → navigate to dashboard "/"
 *   4. On failure → friendly error displayed, user stays on /login
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../../services/authService';

// ---------------------------------------------------------------------------
// Google "G" SVG icon (official brand colours)
// ---------------------------------------------------------------------------

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Spinner — shown inside the button during auth
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Login page component
// ---------------------------------------------------------------------------

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      // Navigate to dashboard on success — replace so back button skips login
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, navigate]);

  return (
    <div
      className="
        relative flex min-h-screen items-center justify-center overflow-hidden
        bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.25),_transparent_40%),
            radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.15),_transparent_45%),
            linear-gradient(135deg,_#060816_0%,_#0f172a_100%)]
        px-4 py-12
      "
    >
      {/* ── Ambient glow orbs (decorative) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full bg-indigo-600/10 blur-[100px]"
      />

      {/* ── Login card ── */}
      <div
        className="
          relative z-10 w-full max-w-md
          rounded-[32px] border border-white/10
          bg-slate-900/70 backdrop-blur-2xl
          shadow-[0_32px_80px_rgba(15,23,42,0.6),0_0_0_1px_rgba(124,58,237,0.12)]
          p-8 sm:p-10
        "
      >
        {/* ── Logo mark ── */}
        <div className="flex justify-center">
          <div
            className="
              flex h-16 w-16 items-center justify-center
              rounded-2xl border border-violet-500/30
              bg-gradient-to-br from-violet-600/30 to-indigo-600/20
              shadow-[0_0_32px_rgba(124,58,237,0.35)]
            "
          >
            {/* Stylised "L" monogram */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <rect width="32" height="32" rx="10" fill="url(#logoGrad)" fillOpacity="0" />
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#a78bfa" />
                  <stop offset="1" stopColor="#818cf8" />
                </linearGradient>
              </defs>
              <text
                x="7"
                y="25"
                fontSize="22"
                fontWeight="700"
                fontFamily="Inter, sans-serif"
                fill="url(#logoGrad)"
                letterSpacing="-1"
              >
                L
              </text>
            </svg>
          </div>
        </div>

        {/* ── Brand name + tagline ── */}
        <div className="mt-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">LifeOS AI</h1>
          <p className="mt-1 text-sm font-medium text-violet-300/80 tracking-wide">
            Your Personal AI Operating System
          </p>
        </div>

        {/* ── Divider ── */}
        <div className="my-7 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* ── Welcome copy ── */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">Welcome</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Sign in to access your personal AI assistant.
          </p>
        </div>

        {/* ── Google sign-in button ── */}
        <div className="mt-8">
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            aria-busy={isLoading}
            aria-label={isLoading ? 'Signing in…' : 'Continue with Google'}
            className="
              group relative flex w-full items-center justify-center gap-3
              rounded-2xl border border-white/10 bg-white/5
              px-5 py-3.5
              text-sm font-semibold text-white
              transition-all duration-200
              hover:border-violet-500/40 hover:bg-white/10 hover:-translate-y-0.5
              hover:shadow-[0_8px_24px_rgba(124,58,237,0.25)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60
              active:translate-y-0 active:shadow-none
              disabled:pointer-events-none disabled:opacity-50
            "
          >
            {/* Google icon or spinner */}
            <span className="flex items-center justify-center w-5 h-5">
              {isLoading ? <Spinner /> : <GoogleIcon />}
            </span>

            <span>{isLoading ? 'Signing in…' : 'Continue with Google'}</span>

            {/* Hover shimmer overlay */}
            <span
              aria-hidden="true"
              className="
                absolute inset-0 rounded-2xl opacity-0
                bg-gradient-to-r from-violet-600/0 via-violet-500/8 to-violet-600/0
                transition-opacity duration-300
                group-hover:opacity-100
              "
            />
          </button>
        </div>

        {/* ── Error message ── */}
        {error && (
          <div
            role="alert"
            className="
              mt-5 flex items-start gap-3
              rounded-2xl border border-red-500/20 bg-red-500/10
              px-4 py-3.5
            "
          >
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5h2v2H9v-2zm0-8h2v6H9V5z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs leading-relaxed text-red-300">{error}</p>
          </div>
        )}

        {/* ── Footer note ── */}
        <p className="mt-8 text-center text-xs text-slate-500 leading-relaxed">
          By signing in you agree to our{' '}
          <span className="text-slate-400 underline underline-offset-2 cursor-pointer">
            Terms of Service
          </span>{' '}
          and{' '}
          <span className="text-slate-400 underline underline-offset-2 cursor-pointer">
            Privacy Policy
          </span>
          .
        </p>
      </div>
    </div>
  );
}
