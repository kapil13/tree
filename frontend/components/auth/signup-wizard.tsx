"use client";

import { useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { TurnstileCaptcha, type TurnstileCaptchaHandle } from "@/components/auth/turnstile-captcha";
import { auth, errorMessage } from "@/lib/api";
import {
  formatPhoneDisplay,
  isValidIndianMobile,
  phoneForApi,
  sanitizePhoneDigits,
} from "@/lib/phone";
import { useAuth } from "@/lib/auth-store";

const OTP_LENGTH = 6;

type SignupStep = "details" | "verify-phone" | "verify-email";

type CaptchaConfig = { enabled: boolean; site_key?: string | null };

export function SignupWizard({
  captchaConfig,
  onComplete,
  onSwitchToSignIn,
}: {
  captchaConfig?: CaptchaConfig;
  onComplete: () => void;
  onSwitchToSignIn: () => void;
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
      phone_not_verified: "Verify your phone number first.",
      captcha_required: "Please complete the security check.",
      captcha_failed: "Security check failed. Please try again.",
    };
    return map[msg] ?? msg;
  }

  async function startSignup() {
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!isValidIndianMobile(phone)) {
      setError("Enter a valid 10-digit Indian mobile number starting with 6–9.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (!acceptedTerms) {
      setError("Please accept the terms to create an account.");
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
      if (emailRes.dev_hint) setDevHint(emailRes.dev_hint);
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
      onComplete();
    } catch (err) {
      setError(humanize(errorMessage(err)));
    } finally {
      setBusy(false);
    }
  }

  const title =
    step === "details"
      ? "Create your account"
      : step === "verify-phone"
        ? "Verify your phone"
        : "Verify your email";

  const subtitle =
    step === "details"
      ? "Start with BYOT — tag trees for free, including 5 complimentary AI scans. Professional programs can be requested later."
      : step === "verify-phone"
        ? "Enter the 6-digit code sent to your mobile."
        : "Enter the 6-digit code sent to your email address.";

  const captchaWidget =
    captchaEnabled && captchaConfig?.site_key && step === "details" ? (
      <TurnstileCaptcha
        ref={captchaRef}
        siteKey={captchaConfig.site_key}
        onTokenChange={setCaptchaToken}
        className="flex justify-center"
      />
    ) : null;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-stone-950">{title}</h3>
        <p className="text-sm text-stone-600">{subtitle}</p>
      </div>

      {step === "details" && (
        <div className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="field-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email address</label>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label">Mobile number</label>
            <div className="flex gap-2">
              <div className="phone-prefix" aria-hidden>
                +91
              </div>
              <input
                className="field-input-flex"
                type="tel"
                inputMode="numeric"
                value={formatPhoneDisplay(phone)}
                onChange={(e) => setPhone(sanitizePhoneDigits(e.target.value))}
                placeholder="98765 43210"
              />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 12 characters"
            />
          </div>
          <label className="flex items-start gap-3 text-sm text-stone-600">
            <input
              type="checkbox"
              className="mt-1"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <span>I agree to the platform terms and data use policy.</span>
          </label>
          {captchaWidget}
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void startSignup()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === "verify-phone" && (
        <div className="space-y-4">
          <input
            className="field-input text-center text-lg tracking-[0.5em]"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            value={phoneOtp}
            onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
            placeholder="000000"
          />
          {devHint ? <p className="text-xs text-amber-800">Dev code: {devHint}</p> : null}
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void verifyPhone()}>
            {busy ? "Verifying…" : "Verify phone"}
          </button>
          <button type="button" className="btn-ghost w-full text-sm" onClick={() => setStep("details")}>
            Back
          </button>
        </div>
      )}

      {step === "verify-email" && (
        <div className="space-y-4">
          <input
            className="field-input text-center text-lg tracking-[0.5em]"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            value={emailOtp}
            onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
            placeholder="000000"
          />
          {devHint ? <p className="text-xs text-amber-800">Dev code: {devHint}</p> : null}
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void completeSignup()}>
            {busy ? "Creating account…" : "Finish — start with BYOT"}
          </button>
        </div>
      )}

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <p className="text-center text-sm text-stone-600">
        Already have an account?{" "}
        <button type="button" className="font-medium text-forest-700 hover:underline" onClick={onSwitchToSignIn}>
          Sign in
        </button>
      </p>
    </div>
  );
}
