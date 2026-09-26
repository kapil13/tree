import type { Metadata } from "next";
import "../presentation/presentation-deck.css";
import "../presentation/gov-ppt.css";
import "../presentation/pitch-deck.css";

export const metadata: Metadata = {
  title: "Aranyix Professional Briefing — Full Deck",
  description:
    "26-slide professional briefing for Aranyix: plantation MRV, satellite monitoring, carbon, biodiversity, compliance and audit-ready evidence.",
  robots: "noindex, nofollow",
};

export default function PresentationaLayout({ children }: { children: React.ReactNode }) {
  return <div className="presentation-layout">{children}</div>;
}
