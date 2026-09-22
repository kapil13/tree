import type { Metadata } from "next";
import "./presentation-deck.css";
import "./gov-ppt.css";
import "./pitch-deck.css";
import "./institutional-deck.css";

export const metadata: Metadata = {
  title: "Aranyix Institutional Briefing — Plantation Intelligence Platform",
  description:
    "33-slide institutional presentation: field MRV, always-on scan engine, intelligence fusion, India scheme depth, compliance universe, and integrity anti-fraud.",
  robots: "noindex, nofollow",
};

export default function PresentationLayout({ children }: { children: React.ReactNode }) {
  return <div className="presentation-layout">{children}</div>;
}
