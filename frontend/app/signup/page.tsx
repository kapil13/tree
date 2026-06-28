"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

type Step = "form" | "otp";

export default function SignupPage() {
  const router = useRouter();
  const { setSession, setUser } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "farmer",
    organization_name: "",
  });
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestOtpForEmail(email: string) {
    const res = await auth.requestOtp({ email });
    setDevCode(res.dev_code ?? null);
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await auth.register(form);
      await requestOtpForEmail(form.email);
      setStep("otp");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const tokens = await auth.verifyOtp({ email: form.email, code: otp });
      setSession(tokens);
      setUser(await auth.me());
      router.push("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onResendOtp() {
    setBusy(true);
    setError(null);
    try {
      await requestOtpForEmail(form.email);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (step === "otp") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-forest-50 px-6">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-2xl font-bold text-forest-800">
            🌳 BYOT
          </Link>
          <form onSubmit={onVerifyOtp} className="card space-y-4">
            <h1 className="text-xl font-semibold">Verify your email</h1>
            <p className="text-sm text-stone-600">
              We sent a 6-digit code to <strong>{form.email}</strong>. Enter it below to finish
              creating your account.
            </p>
            {devCode && (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Local dev: your code is <strong className="font-mono">{devCode}</strong> (also in
                backend logs).
              </div>
            )}
            <div>
              <label className="label" htmlFor="otp">Verification code</label>
              <input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="input font-mono tracking-widest"
                placeholder="000000"
              />
            </div>
            {error && <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
            <button disabled={busy || otp.length !== 6} className="btn-primary w-full">
              {busy ? "Verifying…" : "Verify and continue"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onResendOtp}
              className="w-full text-sm text-forest-700 underline"
            >
              Resend code
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-forest-50 px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-2xl font-bold text-forest-800">
          🌳 BYOT
        </Link>
        <form onSubmit={onRegister} className="card space-y-4">
          <h1 className="text-xl font-semibold">Create your account</h1>
          {(["full_name", "email", "organization_name"] as const).map((f) => (
            <div key={f}>
              <label className="label" htmlFor={f}>{f.replace("_", " ")}</label>
              <input
                id={f}
                required={f !== "organization_name"}
                value={form[f]}
                onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                className="input"
              />
            </div>
          ))}
          <div>
            <label className="label" htmlFor="p">Password (min 12 chars)</label>
            <input
              id="p"
              type="password"
              required
              minLength={12}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="r">Role</label>
            <select
              id="r"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="input"
            >
              {["user", "farmer", "ngo", "corporate", "government"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          {error && <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <button disabled={busy} className="btn-primary w-full">
            {busy ? "Creating…" : "Create account"}
          </button>
          <p className="text-center text-sm text-stone-600">
            Have an account? <Link className="text-forest-700 underline" href="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
