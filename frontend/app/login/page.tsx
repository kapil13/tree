"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { setSession, setUser } = useAuth();
  const [email, setEmail] = useState("demo@byot.earth");
  const [password, setPassword] = useState("byotdemo1234!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
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
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-forest-50 px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-2xl font-bold text-forest-800">
          🌳 BYOT
        </Link>
        <form onSubmit={onSubmit} className="card space-y-4">
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
