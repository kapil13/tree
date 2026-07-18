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
import {
  ArrowLeft,
  Calendar,
  Download,
  ExternalLink,
  Leaf,
  MapPin,
  QrCode,
  Satellite,
  Sparkles,
  TreePine,
} from "lucide-react";
import { NdviImagePreview } from "@/components/ndvi-image-preview";
import { NdviStatsPanel } from "@/components/ndvi-stats-panel";
import { SatelliteHealthPanel } from "@/components/satellite-health-panel";
import { trees, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";

function healthBadgeClass(h: string) {
  if (h === "healthy") return "dash-health-badge--healthy";
  if (h === "moderate") return "dash-health-badge--moderate";
  if (h === "unhealthy") return "dash-health-badge--unhealthy";
  return "dash-health-badge--unknown";
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
    onSuccess: (url) => {
      window.open(url, "_blank");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="dash-skeleton h-40 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="dash-skeleton h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="trees-empty">
        <TreePine className="h-10 w-10 text-stone-400" />
        <h2 className="text-lg font-semibold">Tree not found</h2>
        <p className="text-sm text-stone-500">
          {error ? errorMessage(error) : "This tree may have been removed or you lack access."}
        </p>
        <Link href="/trees" className="btn-primary mt-2">
          <ArrowLeft className="h-4 w-4" /> Back to registry
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
    <div className="trees-shell space-y-6">
      <Link href="/trees" className="inline-flex items-center gap-2 text-sm text-forest-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to tree registry
      </Link>

      <section className="trees-detail-hero">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start gap-3">
              <span className={cn("dash-health-badge capitalize", healthBadgeClass(tree.current_health))}>
                {tree.current_health}
              </span>
              {tree.program_code && (
                <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-lime-800">
                  {tree.program_code.replace(/_/g, " ")}
                </span>
              )}
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-emerald-100/80">
                {tree.status}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-white">
                {tree.species_text || "Species pending identification"}
              </h1>
              <p className="mt-1 font-mono text-sm text-emerald-100/70">{tree.public_code}</p>
            </div>
            <p className="text-sm leading-relaxed text-emerald-100/75">
              Digital tree passport with GPS evidence, carbon accounting, AI health analysis, and
              optional satellite NDVI monitoring for audit-ready MRV.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-primary bg-white text-forest-900 hover:bg-emerald-50"
                onClick={() => analyze.mutate()}
                disabled={analyze.isPending}
              >
                <Sparkles className="h-4 w-4" />
                {analyze.isPending ? "Analyzing…" : "Run AI analysis"}
              </button>
              <button
                className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20"
                onClick={() => downloadPassport.mutate()}
                disabled={downloadPassport.isPending}
              >
                <Download className="h-4 w-4" />
                Passport PDF
              </button>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  <ExternalLink className="h-4 w-4" /> Open in Maps
                </a>
              )}
            </div>
          </div>

          <div className="trees-photo-frame">
            {primaryImage?.cdn_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryImage.cdn_url}
                alt={tree.species_text || tree.public_code}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-emerald-100/60">
                <TreePine className="h-12 w-12" />
                <p className="text-sm">No photo uploaded yet</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {analyze.error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage(analyze.error)}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Carbon stored", value: `${Number(tree.current_carbon_kg).toFixed(2)} kg` },
          { label: "CO₂e equivalent", value: `${co2e.toFixed(2)} kg` },
          { label: "DBH", value: tree.current_dbh_cm ? `${tree.current_dbh_cm} cm` : "Run AI analysis" },
          { label: "Height", value: tree.current_height_m ? `${tree.current_height_m} m` : "Run AI analysis" },
          { label: "Canopy spread", value: tree.current_canopy_m ? `${tree.current_canopy_m} m` : "—" },
          {
            label: "Satellite verified",
            value: tree.satellite_verified ? "Yes" : "Pending scan",
          },
          {
            label: "Registered",
            value: new Date(tree.registered_at).toLocaleDateString(),
          },
          {
            label: "Planted",
            value: tree.planted_at ? new Date(tree.planted_at).toLocaleDateString() : "Not recorded",
          },
        ].map((item) => (
          <div key={item.label} className="trees-metric-card">
            <p className="trees-metric-label">{item.label}</p>
            <p className="trees-metric-value">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Location evidence</h2>
              <p className="dash-panel-sub">GPS coordinates from registration</p>
            </div>
            <MapPin className="h-4 w-4 text-forest-600" />
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-stone-100 py-2">
              <span className="text-stone-500">Latitude</span>
              <span className="font-mono">{tree.latitude?.toFixed(6) ?? "—"}</span>
            </div>
            <div className="flex justify-between border-b border-stone-100 py-2">
              <span className="text-stone-500">Longitude</span>
              <span className="font-mono">{tree.longitude?.toFixed(6) ?? "—"}</span>
            </div>
            <div className="flex justify-between border-b border-stone-100 py-2">
              <span className="text-stone-500">Altitude</span>
              <span>{tree.altitude_m != null ? `${tree.altitude_m} m` : "—"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-stone-500">GPS accuracy</span>
              <span>{tree.accuracy_m != null ? `±${tree.accuracy_m} m` : "—"}</span>
            </div>
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Registration details</h2>
              <p className="dash-panel-sub">Program fields and compliance metadata</p>
            </div>
            <Calendar className="h-4 w-4 text-forest-600" />
          </div>
          {metadataEntries.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">No extra program metadata recorded.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {metadataEntries.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 rounded-lg bg-stone-50 px-3 py-2 text-sm">
                  <span className="text-stone-500">{key.replace(/_/g, " ")}</span>
                  <span className="text-right font-medium text-stone-800">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {tree.images.length > 0 && (
        <section className="dash-panel">
          <h2 className="dash-panel-title">Photo evidence</h2>
          <p className="dash-panel-sub">{tree.images.length} image(s) attached to this passport</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tree.images.map((img) => (
              <div key={img.id} className="overflow-hidden rounded-xl border border-stone-200">
                {img.cdn_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.cdn_url} alt="" className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-stone-100 text-xs text-stone-500">
                    Image unavailable
                  </div>
                )}
                {img.is_primary && (
                  <div className="bg-forest-50 px-2 py-1 text-[10px] font-semibold uppercase text-forest-700">
                    Primary photo
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="dash-panel">
        <div className="dash-panel-head">
          <div>
            <h2 className="dash-panel-title">AI analysis history</h2>
            <p className="dash-panel-sub">
              {tree.last_analysis_at
                ? `Last run ${new Date(tree.last_analysis_at).toLocaleString()}`
                : "No analysis run yet"}
            </p>
          </div>
          <Leaf className="h-4 w-4 text-forest-600" />
        </div>
        {!analyses?.length ? (
          <div className="trees-inline-empty mt-4">
            <Sparkles className="h-8 w-8 text-stone-400" />
            <p>Run AI analysis to detect species, health class, growth metrics, and recommendations.</p>
            <button className="btn-primary mt-2" onClick={() => analyze.mutate()} disabled={analyze.isPending}>
              Run first analysis
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {analyses.slice(0, 5).map((a) => (
              <div key={a.id} className="rounded-xl border border-stone-100 bg-stone-50/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={cn("dash-health-badge capitalize", healthBadgeClass(a.health ?? "unknown"))}>
                    {a.health ?? "unknown"}
                  </span>
                  <span className="text-xs text-stone-500">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div>DBH: {a.estimated_dbh_cm ? `${a.estimated_dbh_cm} cm` : "—"}</div>
                  <div>Height: {a.estimated_height_m ? `${a.estimated_height_m} m` : "—"}</div>
                  <div>
                    Confidence:{" "}
                    {a.overall_confidence != null ? `${Math.round(a.overall_confidence * 100)}%` : "—"}
                  </div>
                </div>
                {a.recommendations && a.recommendations.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-stone-600">
                    {a.recommendations.slice(0, 3).map((r, i) => (
                      <li key={i}>• {r.text}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Satellite className="h-5 w-5 text-forest-700" />
          <h2 className="text-lg font-semibold text-stone-900">Satellite monitoring</h2>
        </div>

        {sat?.points?.length ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="dash-panel">
                <h3 className="text-sm font-medium text-stone-800">NDVI map (10 m chip)</h3>
                <div className="mt-3">
                  <NdviImagePreview
                    treeId={id}
                    ndvi={sat.latest?.ndvi_mean ?? sat.points[sat.points.length - 1]?.ndvi}
                  />
                </div>
              </div>
              <div className="dash-panel">
                <h3 className="text-sm font-medium text-stone-800">NDVI parameters (Sentinel-2)</h3>
                <div className="mt-3">
                  <NdviStatsPanel latest={sat.latest} resolutionLabel="10 m chip" />
                </div>
              </div>
            </div>

            <div className="dash-panel">
              <h3 className="text-sm font-medium text-stone-800">NDVI time series</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={sat.points.map((p) => ({
                      date: new Date(p.ts).toISOString().slice(0, 7),
                      ndvi: p.ndvi,
                    }))}
                  >
                    <defs>
                      <linearGradient id="treeNdvi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16a34a" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="date" fontSize={12} stroke="#78716c" />
                    <YAxis domain={[0, 1]} fontSize={12} stroke="#78716c" />
                    <Tooltip formatter={(value: number) => [value.toFixed(3), "NDVI"]} />
                    <Area
                      type="monotone"
                      dataKey="ndvi"
                      stroke="#16a34a"
                      strokeWidth={2}
                      fill="url(#treeNdvi)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="trees-inline-empty dash-panel">
            <Satellite className="h-8 w-8 text-stone-400" />
            <p>
              No satellite NDVI scans yet for this tree. Visit the Satellite page to trigger
              Sentinel-2 monitoring and unlock canopy health trends.
            </p>
            <Link href="/satellite" className="btn-primary mt-2">
              Go to satellite monitoring
            </Link>
          </div>
        )}

        <SatelliteHealthPanel kind="tree" targetId={id} />
      </section>

      <section className="dash-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="dash-panel-title">Digital passport</h2>
            <p className="dash-panel-sub">QR-linked public proof of registration</p>
          </div>
          <QrCode className="h-5 w-5 text-forest-600" />
        </div>
        <p className="mt-3 text-sm text-stone-600">
          Share code <strong className="font-mono">{tree.public_code}</strong> for field verification.
          Download the PDF passport for audit packets and compliance submissions.
        </p>
      </section>
    </div>
  );
}
