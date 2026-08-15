"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fingerprint, Globe, Map, ShieldCheck } from "lucide-react";
import { errorMessage, indiaStack } from "@/lib/api";

export function IndiaStackStatusPanel() {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["india-stack-status"],
    queryFn: () => indiaStack.status(),
  });

  const layers = useQuery({
    queryKey: ["india-stack-bhuvan-layers"],
    queryFn: () => indiaStack.bhuvanLayers(),
  });

  const ekycDemo = useMutation({
    mutationFn: () =>
      indiaStack.aadhaarEkyc({
        aadhaar_last4: "0000",
        full_name: "Demo Field Worker",
        consent: true,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["india-stack-status"] }),
  });

  if (status.isLoading) {
    return <p className="text-sm text-stone-500">Loading India Stack status…</p>;
  }

  if (status.error) {
    return <p className="text-sm text-rose-700">{errorMessage(status.error)}</p>;
  }

  const data = status.data;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <IntegrationCard
          icon={ShieldCheck}
          title="e-Sign / DSC"
          mode={data.esign.provider_mode}
          detail={data.esign.configured ? "ASP configured" : "Stub signatures for dev"}
        />
        <IntegrationCard
          icon={Fingerprint}
          title="DigiLocker"
          mode={data.digilocker.stub_mode ? "stub" : "live"}
          detail={data.digilocker.enabled ? "Land record verification" : "Disabled"}
        />
        <IntegrationCard
          icon={Globe}
          title="Aadhaar e-KYC"
          mode={data.aadhaar_ekyc.provider}
          detail={data.aadhaar_ekyc.enabled ? "Field staff onboarding" : "Disabled"}
        />
        <IntegrationCard
          icon={Map}
          title="Bhuvan WMS"
          mode="wms"
          detail={`${data.bhuvan_wms.layer_count} map layers`}
        />
      </div>

      <div className="card space-y-3">
        <h3 className="text-sm font-medium text-stone-800">Bhuvan WMS layers</h3>
        <ul className="divide-y divide-stone-200 text-sm">
          {(layers.data?.layers ?? []).map((layer) => (
            <li key={layer.id} className="py-2">
              <p className="font-medium">{layer.title}</p>
              <p className="text-xs text-stone-500">{layer.description}</p>
            </li>
          ))}
          {!layers.isLoading && (layers.data?.layers ?? []).length === 0 && (
            <li className="py-2 text-stone-500">No layers returned.</li>
          )}
        </ul>
      </div>

      {data.aadhaar_ekyc.enabled && (
        <div className="card space-y-2">
          <p className="text-xs text-stone-600">Run stub e-KYC demo (development only).</p>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={ekycDemo.isPending}
            onClick={() => ekycDemo.mutate()}
          >
            {ekycDemo.isPending ? "Running…" : "Demo e-KYC stub"}
          </button>
          {ekycDemo.data?.ekyc_ref && (
            <p className="font-mono text-xs text-forest-800">Ref: {ekycDemo.data.ekyc_ref}</p>
          )}
        </div>
      )}
    </div>
  );
}

function IntegrationCard({
  icon: Icon,
  title,
  mode,
  detail,
}: {
  icon: typeof ShieldCheck;
  title: string;
  mode: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-forest-700" />
        <p className="text-sm font-medium">{title}</p>
        <span className="ml-auto rounded bg-stone-100 px-2 py-0.5 font-mono text-xs uppercase">{mode}</span>
      </div>
      <p className="mt-2 text-xs text-stone-500">{detail}</p>
    </div>
  );
}
