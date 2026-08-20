"use client";

import { useRef, useState } from "react";
import { ArrowRight, Leaf, Loader2 } from "lucide-react";
import { TurnstileCaptcha, type TurnstileCaptchaHandle } from "@/components/auth/turnstile-captcha";
import { showToast } from "@/components/toast";
import { citizen } from "@/lib/citizen-api";
import { errorMessage } from "@/lib/api";
import {
  formatPhoneDisplay,
  isValidIndianMobile,
  phoneForApi,
  sanitizePhoneDigits,
} from "@/lib/phone";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/cn";

type CaptchaConfig = { enabled: boolean; site_key?: string | null };

export function CitizenSignupWizard({
  captchaConfig,
  onComplete,
  onSwitchToFullSignup,
}: {
  captchaConfig?: CaptchaConfig;
  onComplete: () => void | Promise<void>;
  onSwitchToFullSignup: () => void;
}) {
  const { setSession, setUser } = useAuth();
  const captchaRef = useRef<TurnstileCaptchaHandle>(null);
  const captchaEnabled = Boolean(captchaConfig?.enabled && captchaConfig.site_key);

  const [step, setStep] = useState<"details" | "verify">("details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [signupToken, setSignupToken] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");

  async function startSignup() {
    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!isValidIndianMobile(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!acceptedTerms) {
      setError("Please accept the terms to continue.");
      return;
    }

    setBusy(true);
    setError(null);
    setDevHint(null);
    try {
      const res = await citizen.signupStart({
        full_name: fullName.trim(),
        phone: phoneForApi(phone),
        password,
        captcha_token: captchaEnabled ? captchaToken : undefined,
      });
      setSignupToken(res.signup_token);
      setDevHint(res.dev_hint ?? null);
      setStep("verify");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function completeSignup() {
    if (phoneOtp.trim().length < 4) {
      setError("Enter the SMS verification code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tokens = await citizen.signupComplete({ signup_token: signupToken, code: phoneOtp.trim() });
      setSession(tokens);
      const me = await (await import("@/lib/api")).auth.me();
      setUser(me);
      showToast("Welcome! Tag your first tree to start earning stewardship points.");
      await onComplete();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5">
        <div className="flex items-center gap-2 text-emerald-800">
          <Leaf className="h-4 w-4" />
          <p className="text-sm font-semibold">Quick citizen signup</p>
        </div>
        <p className="mt-1 text-sm text-emerald-900/75">
          Name, phone, and password only — start tagging trees in under a minute.
        </p>
      </div>

      {step === "details" ? (
        <>
          <div>
            <label className="label" htmlFor="citizen-name">
              Your name
            </label>
            <input
              id="citizen-name"
              className="field-input !rounded-xl !py-2.5"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div>
            <label className="label" htmlFor="citizen-phone">
              Mobile number
            </label>
            <div className="flex gap-2">
              <div className="phone-prefix !rounded-xl" aria-hidden>
                +91
              </div>
              <input
                id="citizen-phone"
                className="field-input-flex !rounded-xl !py-2.5"
                inputMode="numeric"
                autoComplete="tel-national"
                value={formatPhoneDisplay(phone)}
                onChange={(e) => setPhone(sanitizePhoneDigits(e.target.value))}
                placeholder="98765 43210"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="citizen-password">
              Password
            </label>
            <input
              id="citizen-password"
              type="password"
              className="field-input !rounded-xl !py-2.5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <label className="flex items-start gap-3 text-sm text-stone-600">
            <input
              type="checkbox"
              className="mt-1"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <span>
              I agree to the{" "}
              <a href="/terms" target="_blank" rel="noreferrer" className="text-forest-700 underline">
                Terms of Service
              </a>
              ,{" "}
              <a href="/privacy" target="_blank" rel="noreferrer" className="text-forest-700 underline">
                Privacy Policy
              </a>
              , and{" "}
              <a href="/data-use" target="_blank" rel="noreferrer" className="text-forest-700 underline">
                Data Use Policy
              </a>
              .
            </span>
          </label>
          {captchaEnabled ? (
            <TurnstileCaptcha
              ref={captchaRef}
              siteKey={captchaConfig!.site_key!}
              onTokenChange={setCaptchaToken}
            />
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void startSignup()}>
            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Send verification code"}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-stone-600">
            Enter the code sent to <strong>{formatPhoneDisplay(phone)}</strong>.
          </p>
          {devHint ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Dev code: {devHint}</p>
          ) : null}
          <input
            className="field-input !rounded-xl text-center font-mono text-lg tracking-widest"
            inputMode="numeric"
            maxLength={6}
            value={phoneOtp}
            onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void completeSignup()}>
            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Create account"}
          </button>
          <button type="button" className="btn-secondary w-full text-sm" onClick={() => setStep("details")}>
            Back
          </button>
        </>
      )}

      <button
        type="button"
        className={cn("mx-auto flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700")}
        onClick={onSwitchToFullSignup}
      >
        Need a professional account? Full signup
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
