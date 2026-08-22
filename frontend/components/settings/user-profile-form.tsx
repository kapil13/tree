"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { auth, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { INDIAN_STATES, ageFromDateOfBirth } from "@/lib/user-profile";

function toInputDate(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function UserProfileForm() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dateOfMarriage, setDateOfMarriage] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name ?? "");
    setPhone(user.phone ?? "");
    setCity(user.city ?? "");
    setState(user.state ?? "");
    setDateOfBirth(toInputDate(user.date_of_birth));
    setDateOfMarriage(toInputDate(user.date_of_marriage));
  }, [user]);

  const age = useMemo(() => ageFromDateOfBirth(dateOfBirth || null), [dateOfBirth]);

  const saveMutation = useMutation({
    mutationFn: () =>
      auth.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        date_of_birth: dateOfBirth || null,
        date_of_marriage: dateOfMarriage || null,
      }),
    onSuccess: (updated) => {
      setUser(updated);
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setMessage("Profile saved.");
      setError(null);
    },
    onError: (err) => {
      setMessage(null);
      setError(errorMessage(err));
    },
  });

  if (!user) return null;

  return (
    <form
      className="card space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        setError(null);
        saveMutation.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="kpi-label" htmlFor="profile-full-name">
            Full name
          </label>
          <input
            id="profile-full-name"
            className="input mt-1"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
          />
        </div>

        <div>
          <label className="kpi-label" htmlFor="profile-email">
            Email
          </label>
          <input id="profile-email" className="input mt-1 bg-stone-50" value={user.email} readOnly />
          <p className="mt-1 text-xs text-stone-500">Email is managed through sign-in and verification.</p>
        </div>

        <div>
          <label className="kpi-label" htmlFor="profile-phone">
            Phone
          </label>
          <input
            id="profile-phone"
            className="input mt-1"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            inputMode="tel"
          />
        </div>

        <div>
          <label className="kpi-label" htmlFor="profile-dob">
            Date of birth
          </label>
          <input
            id="profile-dob"
            type="date"
            className="input mt-1"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>

        <div>
          <label className="kpi-label" htmlFor="profile-age">
            Age
          </label>
          <input
            id="profile-age"
            className="input mt-1 bg-stone-50"
            value={age != null ? `${age} years` : "—"}
            readOnly
          />
          <p className="mt-1 text-xs text-stone-500">Calculated automatically from date of birth.</p>
        </div>

        <div>
          <label className="kpi-label" htmlFor="profile-marriage">
            Date of marriage
          </label>
          <input
            id="profile-marriage"
            type="date"
            className="input mt-1"
            value={dateOfMarriage}
            onChange={(e) => setDateOfMarriage(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            min={dateOfBirth || undefined}
          />
        </div>

        <div>
          <label className="kpi-label" htmlFor="profile-city">
            City
          </label>
          <input
            id="profile-city"
            className="input mt-1"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Jaipur"
          />
        </div>

        <div>
          <label className="kpi-label" htmlFor="profile-state">
            State
          </label>
          <select
            id="profile-state"
            className="input mt-1"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="">Select state…</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
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

      <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
        {saveMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save profile
      </button>
    </form>
  );
}
