"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { TurnstileCaptcha, type TurnstileCaptchaHandle } from "@/components/auth/turnstile-captcha";
import { auth, errorMessage } from "@/lib/api";
import type { CaptchaConfig } from "@/lib/api";

const OTP_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 12;

type Props = {
  captchaConfig?: CaptchaConfig;
  initialEmail?: string;
  onBack: () => void;
  onComplete: () => Promise<void>;
  onError: (message: string | null) => void;
  setSession: (tokens: import("@/lib/api").Tokens) => void;
};

export function ForgotPasswordForm({
  captchaConfig,
  initialEmail = "",
  onBack,
  onComplete,
  onError,
  setSession,
}: Props) {
  const captchaRef = useRef<TurnstileCaptchaHandle>(null);
  const captchaEnabled = Boolean(captchaConfig?.enabled && captchaConfig.site_key);

  const [step, setStep] = useState<"request" | "confirm">("request");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [devHint, setDevHint] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");

  function resetCaptcha() {
    setCaptchaToken("");
    captchaRef.current?.reset();
  }

  function requireCaptcha(): boolean {
    if (!captchaEnabled) return true;
    if (!captchaToken) {
      onError("Please complete the security check.");
      return false;
    }
    return true;
  }

  async function sendResetCode() {
    if (!email.trim()) {
      onError("Enter your email address.");
      return;
    }
    if (!requireCaptcha()) return;

    setBusy(true);
    onError(null);
    setDevHint(null);
    try {
      const res = await auth.requestPasswordReset(email.trim(), captchaToken || undefined);
      setDevHint(res.dev_hint ?? null);
      setStep("confirm");
      resetCaptcha();
    } catch (err) {
      onError(humanizePasswordResetError(errorMessage(err)));
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset() {
    if (code.trim().length < 4) {
      onError("Enter the verification code from your email.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      onError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      onError("Passwords do not match.");
      return;
    }
    if (!requireCaptcha()) return;

    setBusy(true);
    onError(null);
    try {
      const tokens = await auth.confirmPasswordReset({
        email: email.trim(),
        code: code.trim(),
        password,
        captcha_token: captchaToken || undefined,
      });
      setSession(tokens);
      await onComplete();
    } catch (err) {
      onError(humanizePasswordResetError(errorMessage(err)));
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  }

  const captchaWidget =
    captchaEnabled && captchaConfig?.site_key ? (
      <TurnstileCaptcha
        ref={captchaRef}
        siteKey={captchaConfig.site_key}
        onTokenChange={setCaptchaToken}
        className="flex justify-center"
      />
    ) : null;

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800 hover:text-emerald-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </button>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
          Account recovery
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-stone-950">Reset your password</h2>
        <p className="text-sm leading-relaxed text-stone-600">
          {step === "request"
            ? "We will email you a one-time code to choose a new password."
            : "Enter the code from your email and set a new password."}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Email address</label>
          <input
            className="field-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@organization.com"
            disabled={step === "confirm" || busy}
          />
        </div>

        {step === "confirm" && (
          <>
            <div>
              <label className="label">Verification code</label>
              <input
                className="field-input text-center text-lg tracking-[0.5em]"
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                placeholder="••••••"
              />
              {devHint && (
                <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Email delivery is not enabled yet. Use code:{" "}
                  <span className="font-mono font-bold">{devHint}</span>
                </p>
              )}
            </div>
            <div>
              <label className="label">New password</label>
              <input
                className="field-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input
                className="field-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
              />
            </div>
          </>
        )}

        {captchaWidget}

        <button
          type="button"
          disabled={busy}
          className="btn-primary w-full"
          onClick={() => void (step === "request" ? sendResetCode() : confirmReset())}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : step === "request" ? (
            "Send reset code"
          ) : (
            <>
              Reset password
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {step === "confirm" && (
          <button
            type="button"
            className="btn-ghost w-full text-sm"
            disabled={busy}
            onClick={() => {
              setStep("request");
              setCode("");
              setPassword("");
              setConfirmPassword("");
              setDevHint(null);
              resetCaptcha();
              onError(null);
            }}
          >
            Resend code
          </button>
        )}
      </div>
    </div>
  );
}

function humanizePasswordResetError(msg: string): string {
  if (msg === "invalid_otp") return "Invalid or expired verification code.";
  if (msg === "email_otp_not_configured") {
    return "Password reset email is temporarily unavailable. Contact support.";
  }
  if (msg === "captcha_required" || msg === "captcha_failed") {
    return "Security check failed. Please try again.";
  }
  if (msg === "rate_limited" || msg === "rate_limit_unavailable") {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return msg;
}
