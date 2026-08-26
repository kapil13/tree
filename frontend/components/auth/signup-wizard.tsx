"use client";

import { useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { TurnstileCaptcha, type TurnstileCaptchaHandle } from "@/components/auth/turnstile-captcha";
import { auth, errorMessage } from "@/lib/api";
import {
  formatPhoneDisplay,
  isValidIndianMobile,
  phoneForApi,
  sanitizePhoneDigits,
} from "@/lib/phone";
import {
  INDIVIDUAL_SIGNUP_OPTIONS,
  ORGANIZATION_SIGNUP_OPTIONS,
  programThemeForSignup,
} from "@/lib/program-catalog";
import { useAuth } from "@/lib/auth-store";
import { setLocaleCookie } from "@/lib/locale-actions";
import type { AppLocale } from "@/i18n/request";
import { cn } from "@/lib/cn";
import type { InvitePreview } from "@/lib/organizations-api";

const OTP_LENGTH = 6;

type SignupStep = "details" | "verify-phone" | "verify-email" | "choose-intent";

type CaptchaConfig = { enabled: boolean; site_key?: string | null };

function useSignupErrors() {
  const t = useTranslations("auth");
  return (msg: string) => {
    const map: Record<string, string> = {
      email_taken: t("errorEmailTaken"),
      phone_taken: t("errorPhoneTaken"),
      invalid_phone: t("errorInvalidPhone"),
      invalid_otp: t("errorInvalidOtp"),
      signup_session_expired: t("errorSignupExpired"),
      email_send_failed: t("errorEmailSend"),
      email_otp_not_configured: t("errorEmailOtpUnavailable"),
      email_dependencies_missing: t("errorEmailOtpUnavailable"),
      gmail_not_configured: t("errorEmailOtpUnavailable"),
      sms_not_configured: t("errorSmsNotConfigured"),
      sms_send_failed: t("errorSmsSend"),
      captcha_required: t("errorCaptcha"),
      captcha_failed: t("errorCaptchaFailed"),
      rate_limited: t("errorRateLimited"),
      rate_limit_unavailable: t("errorRateLimited"),
    };
    return map[msg] ?? msg;
  };
}

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
  const t = useTranslations("auth");
  const humanizeSignupError = useSignupErrors();
  const { setSession, setUser } = useAuth();
  const captchaRef = useRef<TurnstileCaptchaHandle>(null);
  const captchaEnabled = Boolean(captchaConfig?.enabled && captchaConfig.site_key);
  const skipIntent = Boolean(invitePreview);

  const [step, setStep] = useState<SignupStep>("details");
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  const [signupToken, setSignupToken] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");

  const totalSteps = skipIntent ? 3 : 4;
  const stepNumber =
    step === "details" ? 1 : step === "verify-phone" ? 2 : step === "verify-email" ? 3 : 4;

  function resetCaptcha() {
    setCaptchaToken("");
    captchaRef.current?.reset();
  }

  async function startSignup() {
    if (!fullName.trim()) {
      setError(t("errorFullName"));
      return;
    }
    if (!email.trim()) {
      setError(t("errorEmail"));
      return;
    }
    if (!isValidIndianMobile(phone)) {
      setError(t("errorInvalidPhone"));
      return;
    }
    if (password.length < 12) {
      setError(t("errorPasswordLength"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("errorPasswordMatch"));
      return;
    }
    if (!acceptedTerms) {
      setError(t("errorTerms"));
      return;
    }
    if (captchaEnabled && !captchaToken) {
      setError(t("errorCaptcha"));
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
      setError(humanizeSignupError(errorMessage(err)));
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  }

  async function verifyPhone() {
    if (phoneOtp.length < 4) {
      setError(t("errorPhoneOtp"));
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
      setError(humanizeSignupError(errorMessage(err)));
    } finally {
      setBusy(false);
    }
  }

  async function afterEmailVerified() {
    if (emailOtp.length < 4) {
      setError(t("errorEmailOtp"));
      return;
    }
    if (skipIntent) {
      await completeSignup("byot");
      return;
    }
    setError(null);
    setStep("choose-intent");
  }

  async function completeSignup(category: string = signupCategory) {
    if (emailOtp.length < 4) {
      setError(t("errorEmailOtp"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tokens = await auth.signupComplete({
        signup_token: signupToken,
        code: emailOtp,
        signup_category: category,
      });
      setSession(tokens);
      const me = await auth.me();
      setUser(me);
      if (me.locale === "en" || me.locale === "hi") {
        await setLocaleCookie(me.locale as AppLocale);
      }
      await onComplete();
    } catch (err) {
      setError(humanizeSignupError(errorMessage(err)));
    } finally {
      setBusy(false);
    }
  }

  const isProfessional = signupCategory !== "byot";

  const title =
    step === "details"
      ? t("signupTitleDetails")
      : step === "verify-phone"
        ? t("signupTitlePhone")
        : step === "verify-email"
          ? t("signupTitleEmail")
          : t("signupTitleIntent");

  const subtitle =
    step === "details"
      ? invitePreview
        ? t("signupSubtitleDetailsInvite", {
            org: invitePreview.organization_name,
            role: invitePreview.org_role.replace("_", " "),
          })
        : t("signupSubtitleDetails")
      : step === "verify-phone"
        ? t("signupSubtitlePhone", { phone: formatPhoneDisplay(phone) })
        : step === "verify-email"
          ? t("signupSubtitleEmail", { email: email.trim() })
          : t("signupSubtitleIntent");

  const captchaWidget =
    captchaEnabled && captchaConfig?.site_key && step === "details" ? (
      <TurnstileCaptcha
        ref={captchaRef}
        siteKey={captchaConfig.site_key}
        onTokenChange={setCaptchaToken}
        className="flex justify-center"
      />
    ) : null;

  function renderIntentOption(option: (typeof INDIVIDUAL_SIGNUP_OPTIONS)[number]) {
    const theme = programThemeForSignup(option.code);
    const Icon = theme.icon;
    const selected = signupCategory === option.code;
    return (
      <button
        key={option.code}
        type="button"
        onClick={() => setSignupCategory(option.code)}
        className={cn(
          "flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition",
          selected
            ? `border-forest-600 bg-forest-50/80 ring-2 ${theme.ring}`
            : "border-stone-200 hover:border-stone-300",
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white",
            theme.gradient,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900">{option.name}</p>
          <p className="mt-0.5 text-xs leading-snug text-stone-500">{option.description}</p>
          {option.audience === "organization" ? (
            <p className="mt-0.5 text-[11px] text-amber-800">{t("requiresApproval")}</p>
          ) : null}
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
          {t("stepOf", { current: stepNumber, total: totalSteps })}
        </p>
        <h3 className="text-lg font-semibold text-stone-950">{title}</h3>
        <p className="text-sm text-stone-500">{subtitle}</p>
      </div>

      {step === "details" && (
        <div className="space-y-2.5">
          <div>
            <label className="label mb-1">{t("fullName")}</label>
            <input
              className="field-input !rounded-xl !py-2.5"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div>
            <label className="label mb-1">{t("emailAddress")}</label>
            <input
              className="field-input !rounded-xl !py-2.5"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label mb-1">{t("mobileNumber")}</label>
            <div className="flex gap-2">
              <div className="phone-prefix !rounded-xl" aria-hidden>
                +91
              </div>
              <input
                className="field-input-flex !rounded-xl !py-2.5"
                type="tel"
                inputMode="numeric"
                value={formatPhoneDisplay(phone)}
                onChange={(e) => setPhone(sanitizePhoneDigits(e.target.value))}
                placeholder="98765 43210"
                autoComplete="tel-national"
              />
            </div>
          </div>
          <div>
            <label className="label mb-1">{t("password")}</label>
            <input
              className="field-input !rounded-xl !py-2.5"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 12 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label mb-1">{t("confirmPassword")}</label>
            <input
              className="field-input !rounded-xl !py-2.5"
              type="password"
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
          {captchaWidget}
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void startSignup()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("continue")}
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
              {t("devSmsHint")} <span className="font-mono font-bold">{devHint}</span>
            </p>
          ) : null}
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void verifyPhone()}>
            {busy ? t("loadingAuth") : t("verifyPhone")}
          </button>
          <button type="button" className="btn-ghost w-full text-sm" onClick={() => setStep("details")}>
            {t("back")}
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
          {devHint ? (
            <p className="text-xs text-amber-800">
              {t("devEmailHint")} {devHint}
            </p>
          ) : null}
          <button
            type="button"
            className="btn-primary w-full"
            disabled={busy}
            onClick={() => void afterEmailVerified()}
          >
            {busy ? t("loadingAuth") : skipIntent ? t("createAccount") : t("continue")}
          </button>
          <button type="button" className="btn-ghost w-full text-sm" onClick={() => setStep("verify-phone")}>
            {t("back")}
          </button>
        </div>
      )}

      {step === "choose-intent" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("individual")}</p>
            {INDIVIDUAL_SIGNUP_OPTIONS.map(renderIntentOption)}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("organization")}</p>
            {ORGANIZATION_SIGNUP_OPTIONS.map(renderIntentOption)}
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            disabled={busy}
            onClick={() => void completeSignup()}
          >
            {busy
              ? t("creatingAccount")
              : isProfessional
                ? t("createAccountProfessional")
                : t("createAccountCitizen")}
          </button>
          <button type="button" className="btn-ghost w-full text-sm" onClick={() => setStep("verify-email")}>
            {t("back")}
          </button>
        </div>
      )}

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <p className="text-center text-sm text-stone-600">
        {t("alreadyHaveAccount")}{" "}
        <button type="button" className="font-medium text-forest-700 hover:underline" onClick={onSwitchToSignIn}>
          {t("signIn")}
        </button>
      </p>
    </div>
  );
}
