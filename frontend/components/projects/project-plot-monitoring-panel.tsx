"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid3X3, MapPin, RefreshCw } from "lucide-react";
import { CarbonCo2eRange } from "@/components/carbon-co2e-range";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { errorMessage, plotMonitoring, type PlotMonitoringSummary } from "@/lib/api";

export function ProjectPlotMonitoringPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const summaryQ = useQuery({
    queryKey: ["plot-monitoring", projectId],
    queryFn: () => plotMonitoring.summary(projectId),
  });

  const data = summaryQ.data;
  const [mode, setMode] = useState<"full_census" | "plot_based" | "hybrid">("plot_based");
  const [plotsPerStratum, setPlotsPerStratum] = useState("5");
  const [plotArea, setPlotArea] = useState("400");

  const saveDesign = useMutation({
    mutationFn: () =>
      plotMonitoring.upsertDesign(projectId, {
        mode,
        stratification: "work_area",
        plots_per_stratum: Number(plotsPerStratum),
        plot_area_m2: Number(plotArea),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plot-monitoring", projectId] }),
  });

  const generatePlots = useMutation({
    mutationFn: () => plotMonitoring.generatePlots(projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plot-monitoring", projectId] }),
  });

  const plotsQ = useQuery({
    queryKey: ["plot-monitoring-plots", projectId],
    queryFn: () => plotMonitoring.listPlots(projectId),
    enabled: Boolean(data?.has_design && (data?.total_plots ?? 0) > 0),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-forest-700" />
          <CardTitle>Stratified plot monitoring</CardTitle>
        </div>
        <CardDescription>
          Plot-based alternative to full tree census — stratified by work area with extrapolated biomass.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {summaryQ.isLoading ? (
          <p className="text-sm text-stone-500">Loading monitoring design…</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs font-medium text-stone-600">Monitoring mode</label>
                <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_census">Full census</SelectItem>
                    <SelectItem value="plot_based">Plot-based</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600">Plots per stratum</label>
                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  max={50}
                  value={plotsPerStratum}
                  onChange={(e) => setPlotsPerStratum(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600">Plot area (m²)</label>
                <Input
                  className="mt-1"
                  type="number"
                  min={25}
                  value={plotArea}
                  onChange={(e) => setPlotArea(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="secondary"
                  disabled={saveDesign.isPending}
                  onClick={() => saveDesign.mutate()}
                >
                  Save design
                </Button>
                <Button
                  disabled={generatePlots.isPending || mode === "full_census"}
                  onClick={() => generatePlots.mutate()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Generate plots
                </Button>
              </div>
            </div>

            {(saveDesign.error || generatePlots.error) && (
              <p className="text-sm text-red-600">
                {errorMessage(saveDesign.error ?? generatePlots.error)}
              </p>
            )}

            {data && data.has_design && data.mode !== "full_census" && (
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/50">
                <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
                  {data.visited_plots ?? 0} / {data.total_plots ?? 0} plots visited
                  {data.stratum_count != null ? ` · ${data.stratum_count} strata` : ""}
                </p>
                {data.extrapolated_co2e_kg != null && data.extrapolated_co2e_kg > 0 ? (
                  <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                    Extrapolated stock:{" "}
                    <CarbonCo2eRange
                      compact
                      data={{
                        co2e_kg: data.extrapolated_co2e_kg,
                        co2e_kg_lower_90: data.co2e_kg_lower_90,
                        co2e_kg_upper_90: data.co2e_kg_upper_90,
                        uncertainty_pct: data.uncertainty_pct,
                      }}
                    />
                  </p>
                ) : null}
                {data.disclosure ? (
                  <p className="mt-1 text-xs text-stone-500">{data.disclosure}</p>
                ) : null}
              </div>
            )}

            {plotsQ.data && plotsQ.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plot code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Coordinates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plotsQ.data.slice(0, 20).map((plot) => (
                    <TableRow key={plot.id}>
                      <TableCell className="font-mono text-xs">{plot.plot_code}</TableCell>
                      <TableCell>{plot.status}</TableCell>
                      <TableCell className="text-xs text-stone-500">
                        <MapPin className="mr-1 inline h-3 w-3" />
                        {plot.center.coordinates[1].toFixed(5)}, {plot.center.coordinates[0].toFixed(5)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
