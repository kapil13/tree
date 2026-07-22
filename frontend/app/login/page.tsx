import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const params = new URLSearchParams({ mode: "signin" });
  if (next?.startsWith("/") && !next.startsWith("//")) {
    params.set("next", next);
  }
  redirect(`/auth?${params.toString()}`);
}
