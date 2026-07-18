"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Download, ExternalLink, Satellite, Sparkles } from "lucide-react";
import { NdviImagePreview } from "@/components/ndvi-image-preview";
import { NdviStatsPanel } from "@/components/ndvi-stats-panel";
import { SatelliteHealthPanel } from "@/components/satellite-health-panel";
import { TreePhoto } from "@/components/trees/tree-photo";
import { trees, errorMessage } from "@/lib/api";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-stone-100 py-2 text-sm last:border-0">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-900">{value}</dd>
    </div>
  );
}

function healthBadge(h: string) {
  const cls =
    h === "healthy"
      ? "badge-healthy"
      : h === "moderate"
        ? "badge-moderate"
        : h === "unhealthy"
          ? "badge-unhealthy"
          : "badge-unknown";
  return <span className={cls}>{h}</span>;
}

export function TreeDetailView() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: tree, isLoading, error } = useQuery({
    queryKey: ["tree", id],
    queryFn: () => trees.get(id),
    enabled: !!id,
  });

  const { data: sat } = useQuery({
    queryKey: ["sat", id],
    queryFn: () => trees.satellite(id),
    enabled: !!id,
    retry: false,
  });

  const { data: analyses } = useQuery({
    queryKey: ["tree-analyses", id],
    queryFn: () => trees.analyses(id),
    enabled: !!id,
  });

  const analyze = useMutation({
    mutationFn: () => trees.analyze(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tree", id] });
      qc.invalidateQueries({ queryKey: ["tree-analyses", id] });
    },
  });

  const downloadPassport = useMutation({
    mutationFn: () => trees.passportPdfUrl(id),
    onSuccess: (url) => window.open(url, "_blank"),
  });

  if (isLoading) return <div className="text-sm text-stone-500">Loading tree…</div>;

  if (error || !tree) {
    return (
      <div className="card text-sm text-rose-700">
        {error ? errorMessage(error) : "Tree not found."}{" "}
        <Link href="/trees" className="text-forest-700 underline">
          Back to trees
        </Link>
      </div>
    );
  }

  const co2e = (Number(tree.current_carbon_kg) * 44) / 12;
  const primaryImage = tree.images.find((i) => i.is_primary) ?? tree.images[0];
  const mapsUrl =
    tree.latitude != null && tree.longitude != null
      ? `https://www.google.com/maps?q=${tree.latitude},${tree.longitude}`
      : null;
  const metadataEntries = Object.entries(tree.metadata ?? {}).filter(
    ([, v]) => v !== null && v !== "" && v !== undefined,
  );

  return (
    <div className="space-y-4">
      <Link href="/trees" className="inline-flex items-center gap-2 text-sm text-forest-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to trees
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{tree.species_text || "Unknown species"}</h1>
          <p className="font-mono text-sm text-stone-500">{tree.public_code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => analyze.mutate()} disabled={analyze.isPending}>
            <Sparkles className="h-4 w-4" />
            {analyze.isPending ? "Analyzing…" : "Run AI analysis"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => downloadPassport.mutate()}
            disabled={downloadPassport.isPending}
          >
            <Download className="h-4 w-4" /> Passport PDF
          </button>
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-secondary">
              <ExternalLink className="h-4 w-4" /> Maps
            </a>
          )}
        </div>
      </div>

      {analyze.error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage(analyze.error)}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="mb-3 text-sm font-medium text-stone-700">Photo</h2>
          {primaryImage ? (
            <TreePhoto
              treeId={tree.id}
              imageId={primaryImage.id}
              alt={tree.species_text || tree.public_code}
              className="aspect-[4/3] w-full rounded-lg object-cover"
            />
          ) : (
            <p className="text-sm text-stone-500">No photo uploaded.</p>
          )}
        </div>

        <div className="card lg:col-span-2">
          <h2 className="mb-3 text-sm font-medium text-stone-700">Overview</h2>
          <dl>
            <Field label="Health" value={healthBadge(tree.current_health)} />
            <Field label="Status" value={tree.status} />
            <Field label="Program" value={tree.program_code?.replace(/_/g, " ") || "—"} />
            <Field label="Carbon" value={`${Number(tree.current_carbon_kg).toFixed(2)} kg`} />
            <Field label="CO₂e" value={`${co2e.toFixed(2)} kg`} />
            <Field label="DBH" value={tree.current_dbh_cm ? `${tree.current_dbh_cm} cm` : "—"} />
            <Field label="Height" value={tree.current_height_m ? `${tree.current_height_m} m` : "—"} />
            <Field label="Canopy" value={tree.current_canopy_m ? `${tree.current_canopy_m} m` : "—"} />
            <Field label="Satellite" value={tree.satellite_verified ? "Verified" : "Pending"} />
            <Field label="Registered" value={new Date(tree.registered_at).toLocaleString()} />
            <Field
              label="Planted"
              value={tree.planted_at ? new Date(tree.planted_at).toLocaleDateString() : "—"}
            />
          </dl>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-sm font-medium text-stone-700">Location</h2>
          <dl>
            <Field label="Latitude" value={tree.latitude?.toFixed(6) ?? "—"} />
            <Field label="Longitude" value={tree.longitude?.toFixed(6) ?? "—"} />
            <Field label="Altitude" value={tree.altitude_m != null ? `${tree.altitude_m} m` : "—"} />
            <Field label="Accuracy" value={tree.accuracy_m != null ? `±${tree.accuracy_m} m` : "—"} />
          </dl>
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-medium text-stone-700">Registration metadata</h2>
          {metadataEntries.length === 0 ? (
            <p className="text-sm text-stone-500">No extra metadata.</p>
          ) : (
            <dl>
              {metadataEntries.map(([key, value]) => (
                <Field key={key} label={key.replace(/_/g, " ")} value={String(value)} />
              ))}
            </dl>
          )}
        </div>
      </div>

      {tree.images.length > 1 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-medium text-stone-700">All photos ({tree.images.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tree.images.map((img) => (
              <TreePhoto
                key={img.id}
                treeId={tree.id}
                imageId={img.id}
                alt=""
                className="aspect-[4/3] w-full rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="mb-3 text-sm font-medium text-stone-700">AI analysis</h2>
        {!analyses?.length ? (
          <p className="text-sm text-stone-500">No analysis yet. Run AI analysis to populate metrics.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-200">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Health</th>
                  <th className="px-3 py-2 text-right">DBH</th>
                  <th className="px-3 py-2 text-right">Height</th>
                  <th className="px-3 py-2 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((a) => (
                  <tr key={a.id} className="border-t border-stone-100">
                    <td className="px-3 py-2">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">{healthBadge(a.health ?? "unknown")}</td>
                    <td className="px-3 py-2 text-right">
                      {a.estimated_dbh_cm ? `${a.estimated_dbh_cm} cm` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {a.estimated_height_m ? `${a.estimated_height_m} m` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {a.overall_confidence != null ? `${Math.round(a.overall_confidence * 100)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="text-sm font-medium text-stone-700">
          <Satellite className="mr-1 inline h-4 w-4" />
          Satellite monitoring
        </h2>

        {sat?.points?.length ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs text-stone-500">NDVI map</p>
                <NdviImagePreview
                  treeId={id}
                  ndvi={sat.latest?.ndvi_mean ?? sat.points[sat.points.length - 1]?.ndvi}
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-stone-500">NDVI parameters</p>
                <NdviStatsPanel latest={sat.latest} resolutionLabel="10 m chip" />
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sat.points.map((p) => ({
                    date: new Date(p.ts).toISOString().slice(0, 7),
                    ndvi: p.ndvi,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="date" fontSize={11} stroke="#78716c" />
                  <YAxis domain={[0, 1]} fontSize={11} stroke="#78716c" />
                  <Tooltip formatter={(value: number) => [value.toFixed(3), "NDVI"]} />
                  <Area type="monotone" dataKey="ndvi" stroke="#16a34a" fill="#16a34a33" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <p className="text-sm text-stone-500">
            No NDVI data yet.{" "}
            <Link href="/satellite" className="text-forest-700 underline">
              Run satellite scan
            </Link>
          </p>
        )}

        <SatelliteHealthPanel kind="tree" targetId={id} />
      </div>
    </div>
  );
}
