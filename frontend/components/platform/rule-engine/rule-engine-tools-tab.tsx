"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Play, Upload } from "lucide-react";
import { cmsAdmin } from "@/lib/cms-api";
import { errorMessage } from "@/lib/api";
import { buildEditableRules } from "@/lib/rule-template-fields";

export function ToolsTab() {
  const { data: templates } = useQuery({
    queryKey: ["cms-rule-templates"],
    queryFn: () => cmsAdmin.listRuleTemplates(),
  });

  const [templateCode, setTemplateCode] = useState("");
  const [importText, setImportText] = useState("");
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCode = templateCode || templates?.[0]?.template_code || "";
  const selected = templates?.find((t) => t.template_code === selectedCode);

  const exportBundle = useMutation({
    mutationFn: () => cmsAdmin.exportRuleTemplates(),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `byot-rule-templates-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded.");
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const importBundle = useMutation({
    mutationFn: () => {
      const parsed = JSON.parse(importText) as { templates: Record<string, unknown>[] };
      return cmsAdmin.importRuleTemplates(parsed);
    },
    onSuccess: (res) => setMessage(`Imported ${res.imported} template overrides.`),
    onError: (err) => setMessage(errorMessage(err)),
  });

  const preview = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No template");
      const rules = buildEditableRules(selected.code_defaults, selected.code_defaults);
      return cmsAdmin.previewRuleTemplate(selectedCode, {
        rules,
        compliance_mode: selected.compliance_mode,
        latitude: 28.6139,
        longitude: 77.209,
        accuracy_m: 8,
        species_text: "Neem",
        photo_count: 2,
      });
    },
    onSuccess: (res) => {
      setPreviewResult(
        res.result.passed
          ? "✓ Sample tree passes compliance with current draft rules."
          : `✗ Issues:\n${res.result.issues.map((i) => `• [${i.severity}] ${i.message}`).join("\n")}`,
      );
    },
    onError: (err) => setPreviewResult(errorMessage(err)),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card space-y-4">
        <h3 className="text-lg font-semibold">Import & export</h3>
        <p className="text-sm text-stone-600">
          Bulk backup or migrate rule overrides across environments (staging → production).
        </p>
        <button
          type="button"
          className="btn-primary"
          disabled={exportBundle.isPending}
          onClick={() => exportBundle.mutate()}
        >
          <Download className="h-4 w-4" />
          Export all templates
        </button>
        <div>
          <label className="kpi-label">Import JSON bundle</label>
          <textarea
            className="input mt-1 min-h-[160px] font-mono text-xs"
            placeholder='{"version":2,"templates":[...]}'
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-secondary"
          disabled={!importText.trim() || importBundle.isPending}
          onClick={() => importBundle.mutate()}
        >
          <Upload className="h-4 w-4" />
          Import bundle
        </button>
      </section>

      <section className="card space-y-4">
        <h3 className="text-lg font-semibold">Compliance preview</h3>
        <p className="text-sm text-stone-600">
          Dry-run a sample tree registration against template defaults (Delhi coordinates, Neem).
        </p>
        <select className="input" value={selectedCode} onChange={(e) => setTemplateCode(e.target.value)}>
          {(templates ?? []).map((t) => (
            <option key={t.template_code} value={t.template_code}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-primary"
          disabled={preview.isPending || !selectedCode}
          onClick={() => preview.mutate()}
        >
          <Play className="h-4 w-4" />
          Run preview
        </button>
        {previewResult && (
          <pre className="whitespace-pre-wrap rounded-xl bg-stone-50 p-4 text-sm text-stone-800 dark:bg-stone-950">
            {previewResult}
          </pre>
        )}
      </section>

      {message && (
        <p className="lg:col-span-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</p>
      )}
    </div>
  );
}
