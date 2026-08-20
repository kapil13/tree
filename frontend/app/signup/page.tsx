import { redirect } from "next/navigation";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams({ mode: "signup" });

  for (const [key, value] of Object.entries(params)) {
    if (key === "mode") continue;
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw) continue;
    if (key === "next" && (!raw.startsWith("/") || raw.startsWith("//"))) continue;
    qs.set(key, raw);
  }

  redirect(`/auth?${qs.toString()}`);
}
