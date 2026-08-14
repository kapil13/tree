"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, ShieldCheck } from "lucide-react";
import { type CreditLedger, credits, errorMessage } from "@/lib/api";
import { downloadBlob } from "@/lib/download-blob";

export function ProjectCreditSerialsPanel({ ledger }: { ledger: CreditLedger }) {
  const qc = useQueryClient();
  const serials = ledger.serials ?? [];
  const [beneficiary, setBeneficiary] = useState("");
  const [activeSerial, setActiveSerial] = useState<string | null>(null);

  const retire = useMutation({
    mutationFn: ({ serialId, beneficiary: b }: { serialId: string; beneficiary: string }) =>
      credits.retireSerial(serialId, { beneficiary: b }),
    onSuccess: () => {
      setBeneficiary("");
      setActiveSerial(null);
      qc.invalidateQueries({ queryKey: ["credit-ledger"] });
    },
  });

  const downloadCert = useMutation({
    mutationFn: (serialId: string) => credits.downloadRetirementCertificate(serialId),
    onSuccess: (blob, serialId) => {
      const serial = serials.find((s) => s.id === serialId);
      downloadBlob(blob, `${serial?.serial_number ?? serialId}-retirement.pdf`);
    },
  });

  if (serials.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        Registry serials are minted when the ledger reaches <strong>issued</strong> status.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-forest-700" />
        <h3 className="text-sm font-medium text-stone-800">Registry serials</h3>
      </div>
      <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200">
        {serials.map((serial) => (
          <li key={serial.id} className="space-y-2 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <code className="font-mono text-xs">{serial.serial_number}</code>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs capitalize">{serial.status}</span>
            </div>
            <p className="text-xs text-stone-500">
              Vintage {serial.vintage_year} · {Number(serial.tco2e_amount).toFixed(4)} tCO₂e
            </p>
            {serial.status === "available" && (
              <div className="flex flex-wrap gap-2 pt-1">
                {activeSerial === serial.id ? (
                  <>
                    <input
                      className="input text-xs"
                      placeholder="Beneficiary name"
                      value={beneficiary}
                      onChange={(e) => setBeneficiary(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-primary text-xs"
                      disabled={!beneficiary.trim() || retire.isPending}
                      onClick={() => retire.mutate({ serialId: serial.id, beneficiary })}
                    >
                      Confirm retirement
                    </button>
                    <button type="button" className="btn-secondary text-xs" onClick={() => setActiveSerial(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn-secondary text-xs" onClick={() => setActiveSerial(serial.id)}>
                    Retire serial
                  </button>
                )}
              </div>
            )}
            {serial.status === "retired" && (
              <button
                type="button"
                className="btn-secondary inline-flex items-center gap-1 text-xs"
                disabled={downloadCert.isPending}
                onClick={() => downloadCert.mutate(serial.id)}
              >
                <Download className="h-3.5 w-3.5" />
                Certificate PDF
              </button>
            )}
          </li>
        ))}
      </ul>
      {retire.error ? (
        <p className="text-xs text-rose-700">{errorMessage(retire.error)}</p>
      ) : null}
    </div>
  );
}
