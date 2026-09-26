"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { auth, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

const MIN_PASSWORD_LENGTH = 12;

export function ChangePasswordForm() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changeMutation = useMutation({
    mutationFn: () => auth.changePassword({ current_password: currentPassword, new_password: newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated. Other signed-in devices will be signed out on their next refresh.");
      setError(null);
    },
    onError: (err) => {
      setMessage(null);
      setError(errorMessage(err));
    },
  });

  if (!user) return null;

  if (!user.has_password) {
    return (
      <div className="card space-y-3">
        <p className="text-sm text-stone-600">
          Your account uses Google sign-in, so there is no password to change here. To sign in with email and
          password instead, use{" "}
          <Link href="/auth?mode=forgot" className="text-forest-700 underline">
            forgot password
          </Link>{" "}
          to set one for <span className="font-medium">{user.email}</span>.
        </p>
      </div>
    );
  }

  return (
    <form
      className="card space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        setError(null);
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
          setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
          return;
        }
        if (newPassword !== confirmPassword) {
          setError("New passwords do not match.");
          return;
        }
        changeMutation.mutate();
      }}
    >
      <div>
        <label className="kpi-label" htmlFor="profile-current-password">
          Current password
        </label>
        <input
          id="profile-current-password"
          className="input mt-1"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="kpi-label" htmlFor="profile-new-password">
          New password
        </label>
        <input
          id="profile-new-password"
          className="input mt-1"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          required
          minLength={MIN_PASSWORD_LENGTH}
        />
      </div>

      <div>
        <label className="kpi-label" htmlFor="profile-confirm-password">
          Confirm new password
        </label>
        <input
          id="profile-confirm-password"
          className="input mt-1"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      {message && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}

      <button type="submit" className="btn-secondary" disabled={changeMutation.isPending}>
        {changeMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <KeyRound className="h-4 w-4" />
        )}
        Change password
      </button>
    </form>
  );
}
