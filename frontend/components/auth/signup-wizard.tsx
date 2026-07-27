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
import { SIGNUP_PROGRAM_OPTIONS, programThemeForSignup } from "@/lib/program-catalog";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import type { InvitePreview } from "@/lib/organizations-api";

const OTP_LENGTH = 6;

type SignupStep = "category" | "details" | "verify-phone" | "verify-email";

type CaptchaConfig = { enabled: boolean; site_key?: string | null };

export function SignupWizard({
  captchaConfig,
  invitePreview,
  inviteToken: _inviteToken,
  onComplete,
  onSwitchToSignIn,
}: {
  captchaConfig?: CaptchaConfig;
  invitePreview?: InvitePreview | null;
  inviteToken?: string | null;
  onComplete: () => void | Promise<void>;
  onSwitchToSignIn: () => void;
}) {
  const { setSession, setUser } = useAuth();
  const captchaRef = useRef<TurnstileCaptchaHandle>(null);
  const captchaEnabled = Boolean(captchaConfig?.enabled && captchaConfig.site_key);

  const [step, setStep] = useState<SignupStep>(invitePreview ? "details" : "category");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);

  const [signupCategory, setSignupCategory] = useState("byot");

  const [fullName, setFullName] = useState(invitePreview?.full_name ?? "");
  const [email, setEmail] = useState(invitePreview?.email ?? "");
  const [phone, setPhone] = useState(
    invitePreview?.phone ? sanitizePhoneDigits(invitePreview.phone.replace(/\D/g, "").slice(-10)) : "",
  );
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
        signup_category: signupCategory,
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
      await onComplete();
    } catch (err) {
      setError(humanize(errorMessage(err)));
    } finally {
      setBusy(false);
    }
  }

  const isProfessional = signupCategory !== "byot";

  const title =
    step === "category"
      ? "How will you use Aranyix?"
      : step === "details"
      ? "Create your account"
      : step === "verify-phone"
        ? "Verify your phone"
        : "Verify your email";

  const subtitle =
    step === "category"
      ? "Choose your path. Professional programs require admin approval after you submit organization details."
      : step === "details"
      ? invitePreview
        ? `Join ${invitePreview.organization_name} as ${invitePreview.org_role.replace("_", " ")}. Verify your phone and email to continue.`
        : isProfessional
          ? "Create your account — you'll complete organization details next, then wait for admin approval."
          : "Start with BYOT — tag trees for free, including 5 complimentary AI scans."
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

      {step === "category" && (
        <div className="space-y-3">
          {SIGNUP_PROGRAM_OPTIONS.map((option) => {
            const theme = programThemeForSignup(option.code);
            const Icon = theme.icon;
            const selected = signupCategory === option.code;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => setSignupCategory(option.code)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition",
                  selected
                    ? `border-forest-600 bg-forest-50/80 ring-2 ${theme.ring}`
                    : "border-stone-200 hover:border-stone-300",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                    theme.gradient,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-stone-900">{option.name}</p>
                  <p className="mt-0.5 text-sm text-stone-600">{option.description}</p>
                  {option.code !== "byot" ? (
                    <p className="mt-1 text-xs text-amber-800">Requires admin approval</p>
                  ) : null}
                </div>
              </button>
            );
          })}
          <button type="button" className="btn-primary w-full" onClick={() => setStep("details")}>
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === "details" && (
        <div className="space-y-4">
          {!invitePreview ? (
            <button type="button" className="btn-ghost text-sm" onClick={() => setStep("category")}>
              ← Change category
            </button>
          ) : null}
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
          {devHint ? (
            <p className="text-xs text-amber-800">
              SMS delivery pending API keys. Dev code: <span className="font-mono font-bold">{devHint}</span>
            </p>
          ) : null}
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
            {busy ? "Creating account…" : isProfessional ? "Continue to organization details" : "Finish — start with BYOT"}
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
