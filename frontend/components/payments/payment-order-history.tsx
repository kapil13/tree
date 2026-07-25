"use client";

import { useQuery } from "@tanstack/react-query";
import { payments, type PaymentOrder } from "@/lib/api";

function formatInr(paise: number) {
  return `₹${(paise / 100).toFixed(0)}`;
}

function statusLabel(status: string) {
  switch (status) {
    case "paid":
      return "Paid";
    case "failed":
      return "Failed";
    case "created":
      return "Pending";
    default:
      return status;
  }
}

function statusClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-forest-100 text-forest-800 dark:bg-forest-900/50 dark:text-forest-200";
    case "failed":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200";
    default:
      return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
  }
}

export function PaymentOrderHistory() {
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ["payments-orders"],
    queryFn: () => payments.listOrders(),
  });

  if (isLoading) {
    return <p className="text-sm text-stone-500">Loading payment history…</p>;
  }

  if (isError) {
    return <p className="text-sm text-rose-700">Could not load payment history.</p>;
  }

  if (orders.length === 0) {
    return (
      <p className="text-sm text-stone-600 dark:text-stone-300">
        No purchases yet. Buy an AI scan pack above when you need more tree analysis credits.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800">
      <table className="min-w-full text-sm">
        <thead className="bg-stone-50 text-left text-stone-600 dark:bg-stone-900 dark:text-stone-400">
          <tr>
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-4 py-2.5 font-medium">Pack</th>
            <th className="px-4 py-2.5 font-medium">Credits</th>
            <th className="px-4 py-2.5 font-medium">Amount</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order: PaymentOrder) => (
            <tr key={order.id} className="border-t border-stone-100 dark:border-stone-800">
              <td className="px-4 py-2.5 text-stone-600 dark:text-stone-300">
                {new Date(order.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-2.5 font-medium">{order.sku.replace(/_/g, " ")}</td>
              <td className="px-4 py-2.5">{order.credits_granted}</td>
              <td className="px-4 py-2.5">{formatInr(order.amount_paise)}</td>
              <td className="px-4 py-2.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(order.status)}`}
                >
                  {statusLabel(order.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
