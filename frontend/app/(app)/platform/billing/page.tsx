"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, IndianRupee, Wallet } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { platformAdmin } from "@/lib/platform-api";

function formatInr(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export default function PlatformBillingPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["platform-billing-summary"],
    queryFn: () => platformAdmin.billingSummary(),
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["platform-billing-orders", statusFilter, page],
    queryFn: () =>
      platformAdmin.listPaymentOrders({
        status: statusFilter || undefined,
        page,
        page_size: 25,
      }),
  });

  const totalPages = orders ? Math.max(1, Math.ceil(orders.total / orders.page_size)) : 1;

  return (
    <PlatformShell>
      <div className="space-y-6">
        <p className="text-sm text-stone-600 dark:text-stone-300">
          Read-only view of Razorpay payment orders and purchased AI scan wallet balances.
        </p>

        {summaryLoading || !summary ? (
          <p className="text-sm text-stone-500">Loading billing summary…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={IndianRupee}
              label="Revenue (paid)"
              value={formatInr(summary.revenue_paise)}
              hint={`${summary.credits_sold} credits sold`}
            />
            <StatCard
              icon={CreditCard}
              label="Orders"
              value={String(summary.orders.total)}
              hint={`${summary.orders.paid} paid · ${summary.orders.pending} pending · ${summary.orders.failed} failed`}
            />
            <StatCard
              icon={Wallet}
              label="Wallet balances"
              value={String(summary.wallets.total_purchased_balance)}
              hint={`${summary.wallets.users_with_balance} users with balance`}
            />
            <StatCard
              icon={CreditCard}
              label="Payments gateway"
              value={summary.payments_enabled ? "Enabled" : "Disabled"}
              hint={summary.payments_enabled ? "Razorpay configured" : "Keys not set"}
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Recent orders</h2>
            <select
              className="input text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="paid">Paid</option>
              <option value="created">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {ordersLoading ? (
            <p className="text-sm text-stone-500">Loading orders…</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
              <table className="min-w-full text-sm">
                <thead className="bg-stone-50 text-left text-stone-600 dark:bg-stone-950">
                  <tr>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Credits</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(orders?.items ?? []).map((row) => (
                    <tr key={row.id} className="border-t border-stone-100 dark:border-stone-800">
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.user_full_name}</div>
                        <div className="text-xs text-stone-500">{row.user_email}</div>
                      </td>
                      <td className="px-4 py-3">{row.sku}</td>
                      <td className="px-4 py-3">{formatInr(row.amount_paise)}</td>
                      <td className="px-4 py-3">{row.credits_granted}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-500">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {orders && orders.total > 0 ? (
            <div className="flex items-center justify-between text-sm text-stone-600">
              <span>
                {orders.total} order{orders.total !== 1 ? "s" : ""} · page {orders.page} of{" "}
                {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </PlatformShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center gap-2 text-stone-500">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "paid"
      ? "bg-emerald-100 text-emerald-800"
      : status === "failed"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles}`}>
      {status}
    </span>
  );
}
