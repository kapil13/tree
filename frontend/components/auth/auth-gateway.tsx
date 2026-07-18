"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { getProgramTheme } from "@/components/registration/program-theme";
import {
  DEFAULT_SIGNUP_PROGRAMS,
  SIGNUP_PROGRAM_OPTIONS,
} from "@/lib/program-catalog";
import { auth, errorMessage, plantingPrograms } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/cn";

type AuthMode = "signin" | "signup";
type AuthMethod = "phone" | "email";

const OTP_LENGTH = 6;

export function AuthGateway({ initialMode = "signin" }: { initialMode?: AuthMode }) {
  const router = useRouter();
  const { setSession, setUser } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [method, setMethod] = useState<AuthMethod>("phone");
  const [signupStep, setSignupStep] = useState<"account" | "programs">("account");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(DEFAULT_SIGNUP_PROGRAMS);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const availablePrograms = SIGNUP_PROGRAM_OPTIONS;

  const title = useMemo(() => {
    if (mode === "signup" && signupStep === "programs") return "Choose your planting programs";
    return mode === "signin" ? "Welcome back" : "Create your Aranyix account";
  }, [mode, signupStep]);

  const subtitle = useMemo(() => {
    if (mode === "signup" && signupStep === "programs") {
      return "Enable the registration forms you need. You can change these anytime in Settings.";
    }
    if (method === "phone") {
      return otpSent
        ? "Enter the 6-digit code sent to your phone."
        : "Sign in securely with a one-time password.";
    }
    return mode === "signin"
      ? "Use your email and password to access the platform."
      : "Start with email, then personalize your registration programs.";
  }, [mode, method, otpSent, signupStep]);

  async function finishLogin() {
    const me = await auth.me();
    setUser(me);
    router.push(mode === "signup" ? "/trees/new" : "/dashboard");
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
    if (mode === "signup" && !fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (mode === "signup" && !acceptedTerms) {
      setError("Please accept the terms to create an account.");
      return;
    }
    setBusy(true);
    setError(null);
    setDevHint(null);
    try {
      const res = await auth.requestOtp({ phone });
      setOtpSent(true);
      if (res.dev_hint) setDevHint(res.dev_hint);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (mode === "signup" && !acceptedTerms) {
      setError("Please accept the terms to create an account.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tokens = await auth.verifyOtp({
        phone,
        code: otp,
        full_name: mode === "signup" ? fullName : undefined,
      });
      setSession(tokens);
      if (mode === "signup") {
        setSignupStep("programs");
        return;
      }
      await finishLogin();
    } catch (err) {
      const msg = errorMessage(err);
      if (msg === "registration_required" && mode === "signin") {
        setMode("signup");
        setError("No account found for this number. Complete sign up below.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function completeSignupPrograms() {
    setBusy(true);
    setError(null);
    try {
      if (selectedPrograms.length) {
        await plantingPrograms.updateMemberships(selectedPrograms);
      }
      await finishLogin();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function emailSignIn() {
    setBusy(true);
    setError(null);
    try {
      const tokens = await auth.login(email, password);
      setSession(tokens);
      await finishLogin();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function emailSignUp() {
    if (!acceptedTerms) {
      setError("Please accept the terms to create an account.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await auth.register({
        email,
        password,
        full_name: fullName,
        program_codes: selectedPrograms,
      });
      const tokens = await auth.login(email, password);
      setSession(tokens);
      await finishLogin();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function toggleProgram(code: string, isDefault: boolean) {
    if (isDefault) return;
    setSelectedPrograms((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    );
  }

  function resetPhoneFlow() {
    setOtpSent(false);
    setOtp("");
    setDevHint(null);
  }

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
                    setSignupStep("account");
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

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                {mode === "signin" ? "Secure access" : "Join Aranyix"}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950">{title}</h2>
              <p className="text-sm leading-relaxed text-stone-600">{subtitle}</p>
            </div>

            {signupStep === "programs" ? (
              <div className="mt-6 space-y-4">
                <div className="space-y-3">
                  {availablePrograms.map((program) => {
                    const checked = selectedPrograms.includes(program.code);
                    const theme = getProgramTheme(program.code);
                    const Icon = theme.icon;
                    return (
                      <button
                        key={program.code}
                        type="button"
                        disabled={program.is_default}
                        onClick={() => toggleProgram(program.code, program.is_default)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition",
                          checked
                            ? cn("ring-2", theme.ring, "border-transparent bg-white shadow-md")
                            : "border-stone-200 hover:border-stone-300",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                            theme.gradient,
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-stone-900">{program.name}</p>
                          <p className="mt-1 text-xs text-stone-500">{program.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <button type="button" className="btn-secondary" onClick={() => setSignupStep("account")}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn-primary flex-1"
                    disabled={busy}
                    onClick={() => (method === "phone" ? void completeSignupPrograms() : void emailSignUp())}
                  >
                    {busy ? "Creating account…" : "Finish and continue"}
                  </button>
                </div>
              </div>
            ) : (
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

                {mode === "signup" && (
                  <div>
                    <label className="label">Full name</label>
                    <input
                      className="field-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                )}

                {method === "phone" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="label">Mobile number</label>
                      <div className="flex gap-2">
                        <div className="field-input flex w-24 items-center justify-center bg-stone-50 text-sm font-medium text-stone-600">
                          +91
                        </div>
                        <input
                          className="field-input flex-1"
                          inputMode="numeric"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="98765 43210"
                          disabled={otpSent}
                        />
                      </div>
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
                          <p className="mt-2 text-xs text-amber-700">
                            Dev mode OTP: <span className="font-mono font-semibold">{devHint}</span>
                          </p>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={busy || (otpSent ? otp.length < OTP_LENGTH : phone.length < 10)}
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
                          placeholder={mode === "signup" ? "Minimum 12 characters" : "Your password"}
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

                    {mode === "signup" && (
                      <label className="flex items-start gap-3 text-sm text-stone-600">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                        />
                        <span>
                          I agree to the platform terms and understand that tree GPS and photos are
                          used for environmental monitoring and verification.
                        </span>
                      </label>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      className="btn-primary w-full"
                      onClick={() => {
                        if (mode === "signup") {
                          if (!fullName.trim()) {
                            setError("Please enter your full name.");
                            return;
                          }
                          setSignupStep("programs");
                          return;
                        }
                        void emailSignIn();
                      }}
                    >
                      {mode === "signin" ? "Sign in" : "Continue"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {mode === "signup" && method === "phone" && !otpSent && (
                  <label className="flex items-start gap-3 text-sm text-stone-600">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                    />
                    <span>I agree to the platform terms and data use policy.</span>
                  </label>
                )}
              </div>
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
