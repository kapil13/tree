"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("turnstile_script_failed"));
    document.head.appendChild(script);
  });
}

function MobileCaptchaInner() {
  const searchParams = useSearchParams();
  const siteKey = searchParams.get("sitekey") ?? "";
  const theme = (searchParams.get("theme") as "light" | "dark" | "auto") || "light";
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectWithToken = useCallback((token: string) => {
    window.location.href = `aranyix://captcha?token=${encodeURIComponent(token)}`;
  }, []);

  useEffect(() => {
    if (!siteKey) {
      setError("Missing site key.");
      return;
    }

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
        }
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: redirectWithToken,
          "expired-callback": () => setError("Security check expired. Pull to refresh in the app."),
          "error-callback": () => setError("Security check failed. Check your connection and retry."),
        });
      })
      .catch(() => {
        if (!cancelled) setError("Could not load security check. Try mobile data or Wi‑Fi.");
      });

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [redirectWithToken, siteKey, theme]);

  return (
    <main
      style={{
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: theme === "dark" ? "#0b1220" : "#f8faf8",
        fontFamily: "system-ui, sans-serif",
        padding: 16,
      }}
    >
      <div ref={containerRef} />
      {error ? (
        <p style={{ marginTop: 12, fontSize: 13, color: "#9a3412", textAlign: "center", maxWidth: 280 }}>
          {error}
        </p>
      ) : null}
    </main>
  );
}

export default function MobileCaptchaPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#f8faf8" }} />}>
      <MobileCaptchaInner />
    </Suspense>
  );
}
