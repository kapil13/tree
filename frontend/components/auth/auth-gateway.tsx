"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { AuthBrandPanel } from "@/components/brand/auth-brand-panel";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { InviteAuthBanner } from "@/components/auth/invite-accept-flow";
import { SignupWizard } from "@/components/auth/signup-wizard";
import { TurnstileCaptcha, type TurnstileCaptchaHandle } from "@/components/auth/turnstile-captcha";
import {
  formatPhoneDisplay,
  isValidIndianMobile,
  phoneForApi,
  sanitizePhoneDigits,
} from "@/lib/phone";
import { auth, errorMessage } from "@/lib/api";
import { organizations } from "@/lib/organizations-api";
import { inviteErrorMessage, inviteLandingPath, storePendingInviteToken } from "@/lib/invite-landing";
import { useAuth } from "@/lib/auth-store";
import { onboardingRedirectPath } from "@/lib/onboarding-routing";
import { syncSessionCookieFromToken } from "@/lib/session-cookie";
import { setLocaleCookie } from "@/lib/locale-actions";
import type { AppLocale } from "@/i18n/request";
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import { cn } from "@/lib/cn";

type AuthMode = "signin" | "signup";
type AuthMethod = "phone" | "email";

const OTP_LENGTH = 6;

function getSafeNextPath(next: string | null): string | null {
  if (!next?.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export function AuthGateway({ initialMode = "signin" }: { initialMode?: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const { setSession, setUser } = useAuth();
  const captchaRef = useRef<TurnstileCaptchaHandle>(null);

  const { data: captchaConfig } = useQuery({
    queryKey: ["auth-captcha-config"],
    queryFn: () => auth.captchaConfig(),
    staleTime: 60_000,
  });

  const inviteToken = searchParams.get("invite");
  const { data: invitePreview } = useQuery({
    queryKey: ["invite-preview", inviteToken],
    queryFn: () => organizations.previewInvite(inviteToken!),
    enabled: Boolean(inviteToken),
    retry: false,
  });

  const captchaEnabled = Boolean(captchaConfig?.enabled && captchaConfig.site_key);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [method, setMethod] = useState<AuthMethod>("email");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);


  function switchMode(next: AuthMode) {
    setMode(next);
    setShowForgotPassword(false);
    setError(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", next);
    router.replace(`/auth?${params.toString()}`, { scroll: false });
  }

  function requireCaptcha(): boolean {
    if (!captchaEnabled) return true;
    if (!captchaToken) {
      setError("Please complete the security check.");
      return false;
    }
    return true;
  }

  function resetCaptcha() {
    setCaptchaToken("");
    captchaRef.current?.reset();
  }

  function humanizeAuthError(msg: string): string {
    if (msg === "captcha_required" || msg === "captcha_failed") {
      return "Security check failed. Please try again.";
    }
    if (msg === "captcha_verification_unavailable") {
      return "Security check is temporarily unavailable. Please try again later.";
    }
    if (msg === "sms_not_configured" || msg === "sms_send_failed") {
      return "Phone OTP is temporarily unavailable. Sign in with email and password, or try again later.";
    }
    if (msg === "email_otp_not_configured") {
      return "Email OTP is temporarily unavailable. Sign in with email and password.";
    }
    if (msg === "invalid_credentials") {
      return "Incorrect email or password.";
    }
    if (msg === "inactive_user") {
      return "This account is inactive. Contact support.";
    }
    if (msg === "organization_suspended") {
      return "Your organization is suspended. Contact your administrator.";
    }
    if (msg === "rate_limited" || msg === "rate_limit_unavailable") {
      return "Too many attempts. Please wait a moment and try again.";
    }
    return msg;
  }

  const subtitle =
    method === "phone"
      ? otpSent
        ? "Enter the 6-digit code sent to your phone."
        : "Sign in securely with a one-time password."
      : "Use your email and password to access the platform.";

  async function finishLogin() {
    const me = await auth.me();
    setUser(me);
    if (me.locale === "en" || me.locale === "hi") {
      await setLocaleCookie(me.locale as AppLocale);
    }
    await syncSessionCookieFromToken();
    if (inviteToken) {
      try {
        const member = await organizations.acceptInvite(inviteToken);
        const refreshed = await auth.me();
        setUser(refreshed);
        router.replace(
          getSafeNextPath(searchParams.get("next")) ??
            inviteLandingPath(member.org_role ?? refreshed.org_role),
        );
        return;
      } catch (err) {
        setError(inviteErrorMessage(errorMessage(err)));
        return;
      }
    }
    router.replace(
      onboardingRedirectPath(me) ??
        getSafeNextPath(searchParams.get("next")) ??
        "/dashboard",
    );
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      if (inviteToken) storePendingInviteToken(inviteToken);
      const { authorize_url } = await auth.googleAuthorize();
      window.location.href = authorize_url;
    } catch (err) {
      setError(
        errorMessage(err) === "google_oauth_not_configured"
          ? "Google sign-in is not configured on this server yet."
          : errorMessage(err),
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    if (!isValidIndianMobile(phone)) {
      setError("Enter a valid 10-digit Indian mobile number starting with 6–9.");
      return;
    }
    if (!requireCaptcha()) return;
    setBusy(true);
    setError(null);
    setDevHint(null);
    try {
      const res = await auth.requestOtp({
        phone: phoneForApi(phone),
        captcha_token: captchaToken || undefined,
      });
      setOtpSent(true);
      // Only show OTP when the API explicitly returns a dev hint (local/dev).
      setDevHint(res.dev_hint ?? null);
    } catch (err) {
      const msg = errorMessage(err);
      setError(
        msg === "invalid_phone"
          ? "Enter a valid 10-digit Indian mobile number starting with 6–9."
          : humanizeAuthError(msg),
      );
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!isValidIndianMobile(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tokens = await auth.verifyOtp({
        phone: phoneForApi(phone),
        code: otp,
      });
      setSession(tokens);
      await finishLogin();
    } catch (err) {
      const msg = errorMessage(err);
      if (msg === "registration_required") {
        switchMode("signup");
        setError("No account found for this number. Create an account below.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function emailSignIn() {
    if (!requireCaptcha()) return;
    setBusy(true);
    setError(null);
    try {
      const tokens = await auth.login(email, password, captchaToken || undefined);
      setSession(tokens);
      await finishLogin();
    } catch (err) {
      setError(humanizeAuthError(errorMessage(err)));
      resetCaptcha();
    } finally {
      setBusy(false);
    }
  }

  function resetPhoneFlow() {
    setOtpSent(false);
    setOtp("");
    setDevHint(null);
    resetCaptcha();
  }

  function openForgotPassword() {
    setShowForgotPassword(true);
    setError(null);
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
    <div className="mx-auto grid h-full w-full max-w-6xl flex-1 grid-cols-1 content-center gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-stretch lg:gap-6 lg:py-5 xl:max-w-7xl">
      <AuthBrandPanel />

      <div className="flex min-h-0 flex-col justify-center">
        <div className="mb-3 space-y-1 lg:hidden">
          <p className="font-display text-2xl font-semibold tracking-tight text-forest-900">Aranyix</p>
          <p className="text-sm text-stone-500">Intelligence for a thriving planet</p>
        </div>

        <div className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-[0_20px_60px_-28px_rgba(5,46,31,0.28)] backdrop-blur-xl">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
            {invitePreview ? <InviteAuthBanner preview={invitePreview} /> : null}

            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-semibold tracking-tight text-stone-950">
                {mode === "signin" ? t("signIn") : t("signUp")}
              </h2>
              <button
                type="button"
                onClick={() => {
                  switchMode(mode === "signin" ? "signup" : "signin");
                  resetPhoneFlow();
                }}
                className="shrink-0 text-sm font-medium text-forest-700 hover:text-forest-900"
              >
                {mode === "signin" ? t("signUp") : t("signIn")}
              </button>
            </div>
            <div className="mb-4">
              <LanguageSwitcher />
            </div>

            {mode === "signup" ? (
              <SignupWizard
                captchaConfig={captchaConfig}
                invitePreview={invitePreview}
                inviteToken={inviteToken}
                onComplete={async () => {
                  if (inviteToken) {
                    try {
                      const member = await organizations.acceptInvite(inviteToken);
                      const refreshed = await auth.me();
                      setUser(refreshed);
                      router.push(inviteLandingPath(member.org_role ?? refreshed.org_role));
                      return;
                    } catch (err) {
                      setError(inviteErrorMessage(errorMessage(err)));
                      return;
                    }
                  }
                  const refreshed = await auth.me();
                  setUser(refreshed);
                  router.push(onboardingRedirectPath(refreshed) ?? "/trees/new");
                }}
                onSwitchToSignIn={() => switchMode("signin")}
              />
            ) : showForgotPassword ? (
              <ForgotPasswordForm
                captchaConfig={captchaConfig}
                initialEmail={email}
                onBack={() => {
                  setShowForgotPassword(false);
                  setError(null);
                }}
                onComplete={finishLogin}
                onError={setError}
                setSession={setSession}
              />
            ) : (
              <>
                <p className="mb-3 text-sm text-stone-500">{subtitle}</p>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
                  >
                    <GoogleMark />
                    {t("continueWithGoogle")}
                  </button>

                  <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-stone-400">
                    <div className="h-px flex-1 bg-stone-200" />
                    or
                    <div className="h-px flex-1 bg-stone-200" />
                  </div>

                  <div className="flex gap-4 border-b border-stone-200 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setMethod("email");
                      }}
                      className={cn(
                        "flex items-center gap-1.5 border-b-2 px-0.5 pb-2 font-medium transition",
                        method === "email"
                          ? "border-forest-700 text-forest-800"
                          : "border-transparent text-stone-500 hover:text-stone-700",
                      )}
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                      {t("email")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMethod("phone");
                        resetPhoneFlow();
                      }}
                      className={cn(
                        "flex items-center gap-1.5 border-b-2 px-0.5 pb-2 font-medium transition",
                        method === "phone"
                          ? "border-forest-700 text-forest-800"
                          : "border-transparent text-stone-500 hover:text-stone-700",
                      )}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Phone OTP
                    </button>
                  </div>

                  {method === "phone" ? (
                    <div className="space-y-2.5">
                      <div>
                        <label className="label mb-1" htmlFor="auth-phone">
                          Mobile number
                        </label>
                        <div className="flex gap-2">
                          <div className="phone-prefix !rounded-xl" aria-hidden>
                            +91
                          </div>
                          <input
                            id="auth-phone"
                            name="phone"
                            className="field-input-flex !rounded-xl !py-2.5"
                            type="tel"
                            autoComplete="tel-national"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={formatPhoneDisplay(phone)}
                            onChange={(e) => setPhone(sanitizePhoneDigits(e.target.value))}
                            placeholder="98765 43210"
                            disabled={otpSent || busy}
                          />
                        </div>
                      </div>

                      {otpSent && (
                        <div>
                          <label className="label mb-1">One-time password</label>
                          <input
                            className="field-input !rounded-xl !py-2.5 text-center text-lg tracking-[0.5em]"
                            inputMode="numeric"
                            maxLength={OTP_LENGTH}
                            value={otp}
                            onChange={(e) =>
                              setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
                            }
                            placeholder="••••••"
                          />
                          {devHint && (
                            <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                              SMS is not enabled yet. Use OTP:{" "}
                              <span className="font-mono font-bold">{devHint}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {!otpSent && captchaWidget}

                      <button
                        type="button"
                        disabled={
                          busy || (otpSent ? otp.length < OTP_LENGTH : !isValidIndianMobile(phone))
                        }
                        className="btn-primary w-full"
                        onClick={() => (otpSent ? void verifyOtp() : void sendOtp())}
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : otpSent ? (
                          "Verify & continue"
                        ) : (
                          "Send OTP"
                        )}
                      </button>

                      {otpSent && (
                        <button
                          type="button"
                          className="btn-ghost w-full text-sm"
                          onClick={resetPhoneFlow}
                        >
                          Change phone number
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div>
                        <label className="label mb-1">{t("email")}</label>
                        <input
                          className="field-input !rounded-xl !py-2.5"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@organization.com"
                        />
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label className="label mb-0">{t("password")}</label>
                          <button
                            type="button"
                            className="text-xs font-medium text-emerald-800 hover:text-emerald-900"
                            onClick={openForgotPassword}
                          >
                            {t("forgotPassword")}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            className="field-input !rounded-xl !py-2.5 pr-11"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Your password"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {captchaWidget}

                      <button
                        type="button"
                        disabled={busy}
                        className="btn-primary w-full"
                        onClick={() => void emailSignIn()}
                      >
                        {t("signIn")}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {error && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-emerald-100/80 bg-emerald-50/50 px-4 py-2 text-[11px] text-emerald-900/80">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>Encrypted sign-in · Field teams &amp; compliance workflows</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M12 11.2v3.2h4.5c-.2 1.1-.9 2.1-1.9 2.7l3 2.3C19.5 17.9 20 15.9 20 14c0-.7-.1-1.3-.2-1.8H12z" />
      <path fill="#34A853" d="M6.6 14.3l-.8.6-2.3 1.8C5.5 19.8 8.5 22 12 22c2.4 0 4.4-.8 5.9-2.1l-3-2.3c-.8.6-1.9 1-2.9 1-2.2 0-4.1-1.5-4.8-3.5z" />
      <path fill="#4A90E2" d="M3.3 7.7C2.5 9.2 2 10.8 2 12.5S2.5 15.8 3.3 17.3c0 0 4.9-3.8 4.9-3.8S6.6 12 6.6 12s0 0-3.3-4.3z" />
      <path fill="#FBBC05" d="M12 6c1.3 0 2.5.4 3.4 1.3l2.5-2.5C16.4 3.5 14.4 2.5 12 2.5 8.5 2.5 5.5 4.7 3.3 7.7l3.3 4.3C7.9 7.5 9.8 6 12 6z" />
    </svg>
  );
}
