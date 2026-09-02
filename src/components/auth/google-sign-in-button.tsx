"use client";

/**
 * FR-AUTH-2 — "Continue with Google" using Google Identity Services.
 *
 * GIS renders its own button into a container div and hands back a signed ID
 * token. We forward that token to the API, which verifies it server-side and
 * returns a normal JIDA session — the browser never decides who the user is.
 *
 * The button hides itself when the deployment has no GOOGLE_CLIENT_ID, so a
 * dev environment without Google configured shows a clean password-only form
 * rather than a button that always errors.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getGoogleConfig, googleSignIn, type AuthSession, type Role } from "@/lib/api";

const GIS_SRC = "https://accounts.google.com/gsi/client";

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "small" | "medium" | "large";
      text?: "signin_with" | "signup_with" | "continue_with";
      shape?: "rectangular" | "pill";
      width?: number;
      logo_alignment?: "left" | "center";
    },
  ) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

let scriptPromise: Promise<void> | null = null;

/** Loads the GIS script once per page, no matter how many buttons mount. */
function loadGoogleScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google sign-in")));
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // allow a retry on remount
      reject(new Error("Failed to load Google sign-in"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export interface GoogleSignInButtonProps {
  /** Role applied only when this Google account is signing up for the first time. */
  role?: Role;
  institution?: string;
  text?: "signin_with" | "signup_with" | "continue_with";
  onSuccess: (session: AuthSession & { created: boolean }) => void;
  onError?: (message: string) => void;
}

export function GoogleSignInButton({
  role,
  institution,
  text = "continue_with",
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable" | "authenticating">(
    "loading",
  );
  /** Why the button is unavailable. Shown only in development. */
  const [reason, setReason] = useState<string | null>(null);

  // Keep the latest role/handlers in a ref: GIS captures the callback once at
  // initialize() time, so reading state directly would freeze the first value.
  const latest = useRef({ role, institution, onSuccess, onError });
  latest.current = { role, institution, onSuccess, onError };

  useEffect(() => {
    let cancelled = false;
    getGoogleConfig()
      .then((config) => {
        if (cancelled) return;
        if (!config.enabled || !config.clientId) {
          // Configured to be off. In production this is a deliberate choice, so
          // the button simply disappears. In development it is nearly always an
          // unset env var, and a silently missing button is a poor clue.
          setStatus("unavailable");
          setReason(
            "Google sign-in is off because GOOGLE_CLIENT_ID is not set in the backend .env.",
          );
          return;
        }
        setClientId(config.clientId);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus("unavailable");
        setReason(
          `Could not reach the API to check Google sign-in (${
            err instanceof Error ? err.message : "unknown error"
          }). Is the backend running, and is CORS_ORIGIN set to this origin?`,
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCredential = useCallback(async (response: { credential?: string }) => {
    if (!response.credential) {
      latest.current.onError?.("Google did not return a credential. Please try again.");
      return;
    }
    setStatus("authenticating");
    try {
      const session = await googleSignIn(
        response.credential,
        latest.current.institution,
      );
      latest.current.onSuccess(session);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Google sign-in failed. Please try again.";
      latest.current.onError?.(message);
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    if (!clientId || !containerRef.current) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        const gis = window.google?.accounts?.id;
        if (cancelled || !gis || !containerRef.current) return;

        gis.initialize({
          client_id: clientId,
          callback: (response) => void handleCredential(response),
          ux_mode: "popup",
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        gis.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          logo_alignment: "left",
          width: 320,
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, handleCredential, text]);

  if (status === "unavailable") {
    // Production: stay invisible — a dead button is worse than no button.
    // Development: say why, so a missing button is a diagnosis and not a mystery.
    if (process.env.NODE_ENV === "production" || !reason) return null;
    return (
      <div className="jida-google-auth">
        <div className="jida-auth-divider" role="separator">
          <span>or</span>
        </div>
        <p className="jida-google-setup-hint">
          <strong>Google sign-in unavailable (development notice)</strong>
          <span>{reason}</span>
          <span>This notice is hidden in production builds.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="jida-google-auth">
      <div className="jida-auth-divider" role="separator">
        <span>or</span>
      </div>
      <div
        ref={containerRef}
        className="jida-google-btn-slot"
        aria-busy={status === "authenticating"}
      />
      {status === "loading" ? (
        <p className="jida-google-hint">Loading Google sign-in…</p>
      ) : null}
      {status === "authenticating" ? (
        <p className="jida-google-hint">Signing you in with Google…</p>
      ) : null}
    </div>
  );
}
