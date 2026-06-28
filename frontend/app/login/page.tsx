"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { auth, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

type Mode = "login" | "verify";

export default function LoginPage() {
  const router = useRouter();
  const { setSession, setUser } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("demo@byot.earth");
  const [password, setPassword] = useState("byotdemo1234!");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const tokens = await auth.login(email, password);
      setSession(tokens);
      const me = await auth.me();
      setUser(me);
      router.push("/dashboard");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        const detail = err.response.data?.detail;
        if (detail === "email_not_verified") {
          try {
            const res = await auth.requestOtp({ email });
            setDevCode(res.dev_code ?? null);
            setMode("verify");
            setError("Verify your email with the code we sent before signing in.");
            return;
          } catch (otpErr) {
            setError(errorMessage(otpErr));
            return;
          }
        }
      }
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
      const tokens = await auth.verifyOtp({ email, code: otp });
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
      const res = await auth.requestOtp({ email });
      setDevCode(res.dev_code ?? null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (mode === "verify") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-forest-50 px-6">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-2xl font-bold text-forest-800">
            🌳 BYOT
          </Link>
          <form onSubmit={onVerifyOtp} className="card space-y-4">
            <h1 className="text-xl font-semibold">Verify your email</h1>
            <p className="text-sm text-stone-600">
              Enter the 6-digit code sent to <strong>{email}</strong>.
            </p>
            {devCode && (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Local dev: your code is <strong className="font-mono">{devCode}</strong>.
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
              />
            </div>
            {error && <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
            <button disabled={busy || otp.length !== 6} className="btn-primary w-full">
              {busy ? "Verifying…" : "Verify and sign in"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onResendOtp}
              className="w-full text-sm text-forest-700 underline"
            >
              Resend code
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode("login");
                setOtp("");
                setError(null);
              }}
              className="w-full text-sm text-stone-600"
            >
              Back to sign in
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
        <form onSubmit={onLogin} className="card space-y-4">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <div>
            <label className="label" htmlFor="e">Email</label>
            <input
              id="e"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="p">Password</label>
            <input
              id="p"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>
          {error && <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <button disabled={busy} className="btn-primary w-full">
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-center text-sm text-stone-600">
            No account? <Link className="text-forest-700 underline" href="/signup">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
