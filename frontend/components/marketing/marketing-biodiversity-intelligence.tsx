"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Mic, Pause, Play, Radio } from "lucide-react";
import { BIODIVERSITY_DEMO_SPECIES } from "@/lib/marketing-home-data";

type BiodiversityIntelligenceProps = {
  eyebrow?: string;
  title?: string;
  copy?: string;
  cta?: { label?: string; href?: string };
  pipelineSteps?: string[];
};

function WaveformBars({ active }: { active: boolean }) {
  const bars = useMemo(() => Array.from({ length: 48 }, (_, i) => 18 + ((i * 17) % 70)), []);
  return (
    <div className={`marketing-bio-waveform${active ? " is-live" : ""}`} aria-hidden>
      {bars.map((height, i) => (
        <span key={i} style={{ ["--h" as string]: `${height}%` }} />
      ))}
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="marketing-bio-confidence" aria-label={`${value}% confidence`}>
      <div className="marketing-bio-confidence-track">
        <div className="marketing-bio-confidence-fill" style={{ width: `${value}%` }} />
      </div>
      <span>{value.toFixed(1)}%</span>
    </div>
  );
}

export function MarketingBiodiversityIntelligence({
  eyebrow = "Biodiversity Intelligence",
  title = "Listen to the landscape",
  copy = "Turn field sound into biodiversity evidence.",
  cta = { label: "Open bioacoustic workspace", href: "/auth?mode=signin&next=/bioacoustic" },
  pipelineSteps = ["Field recording", "Bioacoustic engine", "Species model", "Verified evidence"],
}: BiodiversityIntelligenceProps) {
  const t = useTranslations("marketing.home.bio");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(42);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1);
      setLevel(34 + Math.round(Math.random() * 38));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  const duration = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <section id="biodiversity" className="marketing-bio-intel">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="marketing-bio-intel-head">
          <div>
            <p className="marketing-eyebrow">{eyebrow}</p>
            <h2 className="marketing-section-title font-display">{title}</h2>
            <p className="marketing-section-copy">{copy}</p>
          </div>
          <span className="marketing-demo-badge">{t("demoBadge")}</span>
        </div>

        <div className="marketing-bio-intel-grid">
          <div className="marketing-bio-console">
            <div className="marketing-bio-console-top">
              <div>
                <p className="marketing-bio-console-label">{t("liveSoundMonitoring")}</p>
                <h3>{t("projectSoundscape")}</h3>
              </div>
              <span className={`marketing-bio-live-pill${recording ? " is-active" : ""}`}>
                <Radio className="h-3.5 w-3.5" aria-hidden />
                {recording ? t("recording") : t("standby")}
              </span>
            </div>

            <div className="marketing-bio-spectrogram">
              <WaveformBars active={recording} />
              <div className="marketing-bio-spectrogram-grid" aria-hidden />
            </div>

            <div className="marketing-bio-console-controls">
              <button
                type="button"
                className="marketing-bio-record-btn"
                onClick={() => setRecording((value) => !value)}
                aria-pressed={recording}
              >
                {recording ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {recording ? t("stopDemo") : t("startDemo")}
              </button>
              <div className="marketing-bio-console-metrics">
                <div>
                  <span>{t("duration")}</span>
                  <strong>{duration}</strong>
                </div>
                <div>
                  <span>{t("audioLevel")}</span>
                  <strong>{level} dBFS</strong>
                </div>
                <div>
                  <span>{t("location")}</span>
                  <strong>{t("demoLocation")}</strong>
                </div>
              </div>
            </div>

            <p className="marketing-bio-console-note">{t("consoleNote")}</p>
          </div>

          <aside className="marketing-bio-detections">
            <div className="marketing-bio-detections-head">
              <Mic className="h-5 w-5 text-teal-700" aria-hidden />
              <div>
                <h3>{t("speciesDetection")}</h3>
                <p>{t("speciesDetectionSub")}</p>
              </div>
            </div>

            <ul className="marketing-bio-species-list">
              {BIODIVERSITY_DEMO_SPECIES.map((species) => (
                <li key={species.name}>
                  <div className="marketing-bio-species-main">
                    <strong>{species.name}</strong>
                    <em>{species.scientific}</em>
                  </div>
                  <ConfidenceBar value={species.confidence} />
                  <div className="marketing-bio-species-meta">
                    <span>{species.status === "verified" ? t("verifiedDetection") : t("needsReview")}</span>
                    <span>{t("acousticMatched")}</span>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="marketing-bio-kpis">
              <div>
                <dt>{t("speciesDetected")}</dt>
                <dd>3</dd>
              </div>
              <div>
                <dt>{t("uniqueSpecies")}</dt>
                <dd>3</dd>
              </div>
              <div>
                <dt>{t("recordingsAnalysed")}</dt>
                <dd>—</dd>
              </div>
              <div>
                <dt>{t("meanConfidence")}</dt>
                <dd>91.1%</dd>
              </div>
            </dl>
          </aside>
        </div>

        <ol className="marketing-intel-pipeline" aria-label={t("pipelineAria")}>
          {pipelineSteps.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
              {index < pipelineSteps.length - 1 ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
            </li>
          ))}
        </ol>

        {cta?.label && cta.href ? (
          <div className="marketing-intel-cta">
            <Link href={cta.href} className="btn-primary">
              {cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
