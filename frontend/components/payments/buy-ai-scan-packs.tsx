"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Loader2 } from "lucide-react";
import { errorMessage, payments, type ScanPack } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

type RazorpayHandlerResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });
}

export function BuyAiScanPacks({
  compact = false,
  onSuccess,
}: {
  compact?: boolean;
  onSuccess?: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [busySku, setBusySku] = useState<string | null>(null);

  const { data: catalog } = useQuery({
    queryKey: ["payments-catalog"],
    queryFn: () => payments.catalog(),
  });

  const checkout = useMutation({
    mutationFn: async (sku: string) => {
      setBusySku(sku);
      setMessage(null);
      await loadRazorpayScript();
      const session = await payments.createOrder(sku);
      if (!window.Razorpay) throw new Error("Razorpay unavailable");

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay!({
          key: session.razorpay_key_id,
          amount: session.amount_paise,
          currency: session.currency,
          name: "Aranyix BYOT",
          description: session.label,
          order_id: session.order.razorpay_order_id,
          prefill: {
            name: user?.full_name,
            email: user?.email,
          },
          theme: { color: "#166534" },
          handler: async (response) => {
            try {
              await payments.verify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled")),
          },
        });
        rzp.open();
      });
    },
    onSuccess: () => {
      setMessage("Payment successful — AI scan credits added to your account.");
      qc.invalidateQueries({ queryKey: ["ai-scan-usage"] });
      qc.invalidateQueries({ queryKey: ["payments-orders"] });
      onSuccess?.();
    },
    onError: (err) => {
      const msg = errorMessage(err);
      if (msg !== "Payment cancelled") setMessage(msg);
    },
    onSettled: () => setBusySku(null),
  });

  if (!catalog?.payments_enabled || !catalog.items.length) return null;

  return (
    <div className={compact ? "mt-3 space-y-2" : "space-y-3"}>
      {!compact ? (
        <p className="text-sm font-medium text-stone-800 dark:text-stone-100">Buy AI scan packs</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {catalog.items.map((pack: ScanPack) => (
          <button
            key={pack.sku}
            type="button"
            className="btn-secondary text-sm"
            disabled={checkout.isPending}
            onClick={() => checkout.mutate(pack.sku)}
          >
            {busySku === pack.sku ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {pack.label} — ₹{pack.amount_inr.toFixed(0)}
          </button>
        ))}
      </div>
      {message ? (
        <p className="text-xs text-stone-600 dark:text-stone-300">{message}</p>
      ) : null}
      <p className="text-[11px] text-stone-500">
        Secure payment via Razorpay. Professional program accounts are not charged in-app.
      </p>
    </div>
  );
}
