"use client";

import { useRef, useState } from "react";
import { ArrowRight, Leaf, Loader2 } from "lucide-react";
import { TurnstileCaptcha, type TurnstileCaptchaHandle } from "@/components/auth/turnstile-captcha";
import { showToast } from "@/components/toast";
import { auth, errorMessage } from "@/lib/api";
import {
  formatPhoneDisplay,
  isValidIndianMobile,
  phoneForApi,
  sanitizePhoneDigits,
} from "@/lib/phone";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/cn";

const OTP_LENGTH = 6;

type SignupStep = "details" | "verify-phone" | "verify-email";

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

  const [step, setStep] = useState<SignupStep>("details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [signupToken, setSignupToken] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");

  function resetCaptcha() {
    setCaptchaToken("");
    captchaRef.current?.reset();
  }

  function humanize(msg: string): string {
    const map: Record<string, string> = {
      email_taken: "This email is already registered. Try signing in.",
      phone_taken: "This phone number is already registered.",
      invalid_phone: "Enter a valid 10-digit Indian mobile number starting with 6–9.",
      invalid_otp: "Invalid code. Please try again.",
      signup_session_expired: "Your signup session expired. Please start again.",
      email_send_failed: "Could not send the verification email. Please try again shortly.",
      gmail_not_configured: "Email verification is not configured yet. Contact support.",
      sms_not_configured:
        "Phone verification is temporarily unavailable while SMS delivery is being set up. Please try again later.",
      sms_send_failed: "Could not send the SMS code. Please try again shortly.",
      captcha_required: "Please complete the security check.",
      captcha_failed: "Security check failed. Please try again.",
      rate_limited: "Too many attempts. Please wait a moment and try again.",
      rate_limit_unavailable: "Sign-up is temporarily unavailable. Please try again later.",
    };
    return map[msg] ?? msg;
  }

  async function startSignup() {
    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!isValidIndianMobile(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!acceptedTerms) {
      setError("Please accept the terms to continue.");
      return;
    }
    if (captchaEnabled && !captchaToken) {
      setError("Please complete the security check.");
      return;
    }

    setBusy(true);
    setError(null);
    setDevHint(null);
    try {
      const res = await auth.signupStart({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phoneForApi(phone),
        password,
        captcha_token: captchaToken || undefined,
        signup_category: "byot",
      });
      setSignupToken(res.signup_token);
      if (res.dev_hint) setDevHint(res.dev_hint);
      setStep("verify-phone");
    } catch (err) {
      setError(humanize(errorMessage(err)));
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  }

  async function verifyPhone() {
    if (phoneOtp.length < 4) {
      setError("Enter the code sent to your phone.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await auth.signupVerifyPhone({ signup_token: signupToken, code: phoneOtp });
      const emailRes = await auth.signupSendEmailOtp({ signup_token: signupToken });
      if (emailRes.dev_hint && !emailRes.email_enabled) setDevHint(emailRes.dev_hint);
      else setDevHint(null);
      setStep("verify-email");
    } catch (err) {
      setError(humanize(errorMessage(err)));
    } finally {
      setBusy(false);
    }
  }

  async function completeSignup() {
    if (emailOtp.length < 4) {
      setError("Enter the code sent to your email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tokens = await auth.signupComplete({ signup_token: signupToken, code: emailOtp });
      setSession(tokens);
      const me = await auth.me();
      setUser(me);
      showToast("Welcome! Tag your first tree to start earning stewardship points.");
      await onComplete();
    } catch (err) {
      setError(humanize(errorMessage(err)));
    } finally {
      setBusy(false);
    }
  }

  const title =
    step === "details"
      ? "Create your citizen account"
      : step === "verify-phone"
        ? "Verify your phone"
        : "Verify your email";

  const subtitle =
    step === "details"
      ? "Verify your mobile number and email before your account is created."
      : step === "verify-phone"
        ? `Enter the 6-digit code sent to ${formatPhoneDisplay(phone)}.`
        : `Enter the 6-digit code sent to ${email.trim()}.`;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5">
        <div className="flex items-center gap-2 text-emerald-800">
          <Leaf className="h-4 w-4" />
          <p className="text-sm font-semibold">Citizen signup</p>
        </div>
        <p className="mt-1 text-sm text-emerald-900/75">
          Both your phone and email must be verified before we create your account.
        </p>
      </div>

      <div className="space-y-0.5">
        <h3 className="text-lg font-semibold text-stone-950">{title}</h3>
        <p className="text-sm text-stone-500">{subtitle}</p>
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
            <label className="label" htmlFor="citizen-email">
              Email address
            </label>
            <input
              id="citizen-email"
              className="field-input !rounded-xl !py-2.5"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
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
              placeholder="Minimum 12 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label" htmlFor="citizen-confirm-password">
              Confirm password
            </label>
            <input
              id="citizen-confirm-password"
              type="password"
              className="field-input !rounded-xl !py-2.5"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
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
            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Send verification codes"}
          </button>
        </>
      ) : null}

      {step === "verify-phone" ? (
        <>
          <input
            className="field-input !rounded-xl text-center font-mono text-lg tracking-widest"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            value={phoneOtp}
            onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
            placeholder="000000"
          />
          {devHint ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              SMS delivery pending. Dev code: <span className="font-mono font-bold">{devHint}</span>
            </p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void verifyPhone()}>
            {busy ? "Verifying…" : "Verify phone"}
          </button>
          <button type="button" className="btn-secondary w-full text-sm" onClick={() => setStep("details")}>
            Back
          </button>
        </>
      ) : null}

      {step === "verify-email" ? (
        <>
          <input
            className="field-input !rounded-xl text-center font-mono text-lg tracking-widest"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            value={emailOtp}
            onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
            placeholder="000000"
          />
          {devHint ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Dev code: {devHint}</p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void completeSignup()}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </>
      ) : null}

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
