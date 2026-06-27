"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

export default function SignupPage() {
  const router = useRouter();
  const { setSession, setUser } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "farmer",
    organization_name: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await auth.register(form);
      const tokens = await auth.login(form.email, form.password);
      setSession(tokens);
      setUser(await auth.me());
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
