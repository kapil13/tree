"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlatformShell } from "@/components/platform/platform-shell";
import { platformAdmin } from "@/lib/platform-api";

export default function PlatformAnalyticsPage() {
  const t = useTranslations("platformAdmin.analytics");
  const tc = useTranslations("platformAdmin.common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [ip, setIp] = useState("");
  const [path, setPath] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    setIp(searchParams.get("ip") ?? "");
    setPath(searchParams.get("path") ?? "");
    setSearch(searchParams.get("search") ?? "");
    setDateFrom(searchParams.get("date_from") ?? "");
    setDateTo(searchParams.get("date_to") ?? "");
    const pageParam = searchParams.get("page");
    setPage(pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1);
    setUrlReady(true);
  }, [searchParams]);

  const syncUrl = useCallback(
    (filters: {
      ip: string;
      path: string;
      search: string;
      dateFrom: string;
      dateTo: string;
      page: number;
    }) => {
      const q = new URLSearchParams();
      if (filters.ip) q.set("ip", filters.ip);
      if (filters.path) q.set("path", filters.path);
      if (filters.search) q.set("search", filters.search);
      if (filters.dateFrom) q.set("date_from", filters.dateFrom);
      if (filters.dateTo) q.set("date_to", filters.dateTo);
      if (filters.page > 1) q.set("page", String(filters.page));
      const query = q.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    if (!urlReady) return;
    syncUrl({ ip, path, search, dateFrom, dateTo, page });
  }, [urlReady, ip, path, search, dateFrom, dateTo, page, syncUrl]);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-site-visits", ip, path, search, dateFrom, dateTo, page],
    queryFn: () =>
      platformAdmin.siteVisits({
        page,
        ip: ip || undefined,
        path: path || undefined,
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
    enabled: urlReady,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-stone-600">{t("description")}</p>
        </div>

        <div className="card grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm">
            <span className="label">{t("filterIp")}</span>
            <input
              className="input mt-1"
              value={ip}
              onChange={(e) => {
                setPage(1);
                setIp(e.target.value);
              }}
              placeholder="203.0.113.42"
            />
          </label>
          <label className="text-sm">
            <span className="label">{t("filterPath")}</span>
            <input
              className="input mt-1"
              value={path}
              onChange={(e) => {
                setPage(1);
                setPath(e.target.value);
              }}
              placeholder="/resources"
            />
          </label>
          <label className="text-sm">
            <span className="label">{t("filterFrom")}</span>
            <input
              type="datetime-local"
              className="input mt-1"
              value={dateFrom}
              onChange={(e) => {
                setPage(1);
                setDateFrom(e.target.value);
              }}
            />
          </label>
          <label className="text-sm">
            <span className="label">{t("filterTo")}</span>
            <input
              type="datetime-local"
              className="input mt-1"
              value={dateTo}
              onChange={(e) => {
                setPage(1);
                setDateTo(e.target.value);
              }}
            />
          </label>
          <label className="text-sm md:col-span-2 xl:col-span-4">
            <span className="label">{tc("search")}</span>
            <input
              className="input mt-1"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder={t("searchPlaceholder")}
            />
          </label>
        </div>

        <div className="card overflow-hidden">
          {isLoading ? (
            <p className="p-4 text-sm text-stone-500">{tc("loading")}</p>
          ) : !data?.items.length ? (
            <p className="p-4 text-sm text-stone-500">{t("empty")}</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-2">{t("colTime")}</th>
                  <th className="px-4 py-2">{t("colIp")}</th>
                  <th className="px-4 py-2">{t("colPath")}</th>
                  <th className="px-4 py-2">{t("colVisitor")}</th>
                  <th className="px-4 py-2">{t("colReferrer")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id} className="border-t border-stone-100 align-top">
                    <td className="px-4 py-2 whitespace-nowrap text-stone-600">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-stone-800">
                      {row.ip ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-stone-800">{row.path}</td>
                    <td className="px-4 py-2 font-mono text-xs text-stone-500">
                      {row.visitor_id.slice(0, 8)}…
                    </td>
                    <td className="max-w-xs truncate px-4 py-2 text-stone-500">
                      {row.referrer ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data && data.total > data.page_size ? (
          <div className="flex items-center justify-between text-sm text-stone-600">
            <p>
              {t("pagination", {
                page: data.page,
                totalPages,
                total: data.total,
              })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {tc("previous")}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {tc("next")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </PlatformShell>
  );
}
