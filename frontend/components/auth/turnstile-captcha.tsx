"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

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
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${TURNSTILE_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile_script_failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("turnstile_script_failed"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export type TurnstileCaptchaHandle = {
  reset: () => void;
  getToken: () => string;
};

type Props = {
  siteKey: string;
  onTokenChange: (token: string) => void;
  className?: string;
};

export const TurnstileCaptcha = forwardRef<TurnstileCaptchaHandle, Props>(function TurnstileCaptcha(
  { siteKey, onTokenChange, className },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [verifyError, setVerifyError] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  const updateToken = useCallback(
    (value: string) => {
      setToken(value);
      onTokenChange(value);
      if (value) setVerifyError(false);
    },
    [onTokenChange],
  );

  const remountWidget = useCallback(() => {
    setLoadError(false);
    setVerifyError(false);
    updateToken("");
    setRenderKey((key) => key + 1);
  }, [updateToken]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      updateToken("");
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
    getToken: () => token,
  }));

  useEffect(() => {
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
        }
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: (t) => updateToken(t),
          "expired-callback": () => updateToken(""),
          "error-callback": () => {
            updateToken("");
            setVerifyError(true);
          },
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, updateToken, renderKey]);

  if (loadError || verifyError) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-xs text-amber-800">
          {loadError
            ? "Security check could not load. Disable ad blockers or try another network."
            : "Security check failed. Confirm aranyix.tech is allowed in your Turnstile widget settings, then retry."}
        </p>
        <button type="button" className="text-sm font-medium text-emerald-800 underline" onClick={remountWidget}>
          Retry security check
        </button>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
});
