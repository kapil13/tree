"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Download, IndianRupee, Wallet, X } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { StepUpModal } from "@/components/platform/step-up-modal";
import { notifyPlatformAction, notifyPlatformError } from "@/lib/platform-admin-feedback";
import { platformAdmin, type PlatformPaymentOrder } from "@/lib/platform-api";
import { downloadBlob } from "@/lib/download-blob";

function formatInr(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export default function PlatformBillingPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantCredits, setGrantCredits] = useState("10");
  const [grantReason, setGrantReason] = useState("");

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

  const { data: orderDetail } = useQuery({
    queryKey: ["platform-billing-order", selectedOrderId],
    queryFn: () => platformAdmin.getPaymentOrder(selectedOrderId!),
    enabled: Boolean(selectedOrderId),
  });

  const exportCsv = useMutation({
    mutationFn: () => platformAdmin.exportPaymentOrders({ status: statusFilter || undefined }),
    onSuccess: (blob) => {
      downloadBlob(blob, "platform-payment-orders.csv");
      notifyPlatformAction("Orders exported.");
    },
    onError: (err) => notifyPlatformError(err),
  });

  const grant = useMutation({
    mutationFn: (password: string) =>
      platformAdmin.grantCredits(grantUserId, {
        credits: parseInt(grantCredits, 10),
        reason: grantReason,
        password,
      }),
    onSuccess: (result) => {
      setGrantOpen(false);
      setGrantReason("");
      notifyPlatformAction(
        `Granted ${result.credits_delta} credits. New balance: ${result.new_balance}.`,
        { audit: { actionPrefix: "platform.billing.grant_credits" } },
      );
      qc.invalidateQueries({ queryKey: ["platform-billing-summary"] });
      if (selectedOrderId) {
        qc.invalidateQueries({ queryKey: ["platform-billing-order", selectedOrderId] });
      }
    },
    onError: (err) => notifyPlatformError(err),
  });

  const totalPages = orders ? Math.max(1, Math.ceil(orders.total / orders.page_size)) : 1;

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Payment orders, wallet balances, manual credit grants, and order drill-down.
          </p>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2 text-xs"
            disabled={exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

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

        <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-lg font-semibold">Manual credit grant</h2>
          <p className="mt-1 text-sm text-stone-500">
            Adjust a user&apos;s purchased AI scan balance (positive to grant, negative to debit).
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-stone-600">User ID</span>
              <input
                className="input w-full font-mono text-xs"
                placeholder="UUID"
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-stone-600">Credits</span>
              <input
                className="input w-24"
                type="number"
                value={grantCredits}
                onChange={(e) => setGrantCredits(e.target.value)}
              />
            </label>
            <label className="flex-[2] text-sm">
              <span className="mb-1 block text-stone-600">Reason</span>
              <input
                className="input w-full"
                placeholder="Support ticket or promo"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={!grantUserId || !grantReason.trim() || grant.isPending}
              onClick={() => setGrantOpen(true)}
            >
              Grant credits
            </button>
          </div>
        </section>

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
                    <OrderRow
                      key={row.id}
                      row={row}
                      selected={selectedOrderId === row.id}
                      onSelect={() => setSelectedOrderId(row.id)}
                    />
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

      {selectedOrderId && orderDetail ? (
        <div
          className="fixed inset-0 z-[80] flex justify-end bg-black/30"
          onClick={() => setSelectedOrderId(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto border-l border-stone-200 bg-white p-5 shadow-xl dark:border-stone-700 dark:bg-stone-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Order detail</h2>
                <p className="text-xs text-stone-500">{orderDetail.id}</p>
              </div>
              <button type="button" className="btn-ghost p-1" onClick={() => setSelectedOrderId(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <DetailRow label="Customer" value={`${orderDetail.user_full_name} (${orderDetail.user_email})`} />
              <DetailRow label="Amount" value={formatInr(orderDetail.amount_paise)} />
              <DetailRow label="SKU / credits" value={`${orderDetail.sku} · ${orderDetail.credits_granted}`} />
              <DetailRow label="Status" value={orderDetail.status} />
              <DetailRow label="Razorpay order" value={orderDetail.razorpay_order_id ?? "—"} />
              <DetailRow label="Razorpay payment" value={orderDetail.razorpay_payment_id ?? "—"} />
              <DetailRow label="Wallet balance" value={String(orderDetail.user_wallet_balance)} />
            </dl>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/platform/users/${orderDetail.user_id}`}
                className="btn-secondary text-xs"
              >
                View user
              </Link>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => {
                  setGrantUserId(orderDetail.user_id);
                  setGrantOpen(true);
                }}
              >
                Grant credits
              </button>
            </div>
            {orderDetail.payment_events.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold">Related payment events</h3>
                <ul className="mt-2 space-y-2 text-xs text-stone-600">
                  {orderDetail.payment_events.map((ev) => (
                    <li key={ev.id} className="rounded-lg border border-stone-100 p-2 dark:border-stone-800">
                      <div className="font-medium">{ev.event_type}</div>
                      <div>{new Date(ev.created_at).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <StepUpModal
        open={grantOpen}
        title="Grant AI scan credits"
        description="Re-enter your password to adjust this user's purchased scan balance."
        confirmLabel="Grant credits"
        busy={grant.isPending}
        onClose={() => setGrantOpen(false)}
        onConfirm={(password) => grant.mutate(password)}
      />
    </PlatformShell>
  );
}

function OrderRow({
  row,
  selected,
  onSelect,
}: {
  row: PlatformPaymentOrder;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <tr
      className={`cursor-pointer border-t border-stone-100 dark:border-stone-800 ${selected ? "bg-forest-50 dark:bg-forest-950/30" : "hover:bg-stone-50 dark:hover:bg-stone-800/50"}`}
      onClick={onSelect}
    >
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
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-stone-50 py-1 dark:border-stone-800">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
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
