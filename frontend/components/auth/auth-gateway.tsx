"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { AuthBrandPanel } from "@/components/brand/auth-brand-panel";
import { AranyixLogo } from "@/components/brand/aranyix-logo";
import { SignupWizard } from "@/components/auth/signup-wizard";
import { TurnstileCaptcha, type TurnstileCaptchaHandle } from "@/components/auth/turnstile-captcha";
import {
  formatPhoneDisplay,
  isValidIndianMobile,
  phoneForApi,
  sanitizePhoneDigits,
} from "@/lib/phone";
import { auth, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
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
  const { setSession, setUser } = useAuth();
  const captchaRef = useRef<TurnstileCaptchaHandle>(null);

  const { data: captchaConfig } = useQuery({
    queryKey: ["auth-captcha-config"],
    queryFn: () => auth.captchaConfig(),
    staleTime: 60_000,
  });

  const captchaEnabled = Boolean(captchaConfig?.enabled && captchaConfig.site_key);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [method, setMethod] = useState<AuthMethod>("phone");
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
    return msg;
  }

  const title = mode === "signin" ? "Welcome back" : "Join Aranyix";

  const subtitle =
    method === "phone"
      ? otpSent
        ? "Enter the 6-digit code sent to your phone."
        : "Sign in securely with a one-time password."
      : "Use your email and password to access the platform.";

  async function finishLogin() {
    const me = await auth.me();
    setUser(me);
    router.push(getSafeNextPath(searchParams.get("next")) ?? "/dashboard");
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
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
      if (res.dev_hint) setDevHint(res.dev_hint);
      if (!res.sms_enabled) {
        setDevHint(res.dev_hint ?? "000000");
      }
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
        setMode("signup");
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
    <div className="min-h-screen bg-[#f4faf6]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 p-4 lg:grid-cols-[1.05fr_0.95fr] lg:p-6">
        <AuthBrandPanel />

        <div className="flex flex-col justify-center">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <AranyixLogo className="h-12 w-auto" />
            <Link href="/" className="text-sm font-medium text-emerald-800">
              Home
            </Link>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_-24px_rgba(5,46,31,0.22)] backdrop-blur-xl sm:p-8">
            <div className="mb-6 flex rounded-2xl bg-stone-100 p-1">
              {(["signin", "signup"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setMode(tab);
                    resetPhoneFlow();
                    setError(null);
                  }}
                  className={cn(
                    "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                    mode === tab
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-500 hover:text-stone-700",
                  )}
                >
                  {tab === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            {mode === "signup" ? (
              <div className="mt-6">
                <SignupWizard
                  captchaConfig={captchaConfig}
                  onComplete={() => router.push("/trees/new")}
                  onSwitchToSignIn={() => setMode("signin")}
                />
              </div>
            ) : (
              <>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Secure access
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950">{title}</h2>
              <p className="text-sm leading-relaxed text-stone-600">{subtitle}</p>
            </div>

              <div className="mt-6 space-y-5">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
                >
                  <GoogleMark />
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-stone-400">
                  <div className="h-px flex-1 bg-stone-200" />
                  or
                  <div className="h-px flex-1 bg-stone-200" />
                </div>

                <div className="flex rounded-2xl bg-stone-100 p-1">
                  <MethodTab
                    active={method === "phone"}
                    onClick={() => {
                      setMethod("phone");
                      resetPhoneFlow();
                    }}
                    icon={Phone}
                    label="Phone OTP"
                  />
                  <MethodTab
                    active={method === "email"}
                    onClick={() => setMethod("email")}
                    icon={Mail}
                    label="Email"
                  />
                </div>

                {method === "phone" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="label" htmlFor="auth-phone">
                        Mobile number
                      </label>
                      <div className="flex gap-2">
                        <div className="phone-prefix" aria-hidden>
                          +91
                        </div>
                        <input
                          id="auth-phone"
                          name="phone"
                          className="field-input-flex"
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
                      <p className="mt-1.5 text-xs text-stone-500">
                        10-digit mobile number. Do not include +91.
                      </p>
                    </div>

                    {otpSent && (
                      <div>
                        <label className="label">One-time password</label>
                        <input
                          className="field-input text-center text-lg tracking-[0.5em]"
                          inputMode="numeric"
                          maxLength={OTP_LENGTH}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                          placeholder="••••••"
                        />
                        {devHint && (
                          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            SMS is not enabled yet. Use OTP:{" "}
                            <span className="font-mono font-bold">{devHint}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {!otpSent && captchaWidget}

                    <button
                      type="button"
                      disabled={busy || (otpSent ? otp.length < OTP_LENGTH : !isValidIndianMobile(phone))}
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
                      <button type="button" className="btn-ghost w-full text-sm" onClick={resetPhoneFlow}>
                        Change phone number
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="label">Email address</label>
                      <input
                        className="field-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@organization.com"
                      />
                    </div>
                    <div>
                      <label className="label">Password</label>
                      <div className="relative">
                        <input
                          className="field-input pr-12"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Your password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

              </div>
              </>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>
                Encrypted sign-in · Multi-program access · Built for field teams and compliance workflows
              </span>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-stone-500">
            <Lock className="mr-1 inline h-3.5 w-3.5" />
            DATA · INTELLIGENCE · NATURE · FUTURE
          </p>
        </div>
      </div>
    </div>
  );
}

function MethodTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Phone;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active ? "bg-white text-stone-900 shadow-sm" : "text-stone-500",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
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
