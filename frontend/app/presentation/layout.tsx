import type { Metadata } from "next";
import "./presentation-deck.css";

export const metadata: Metadata = {
  title: "Aranyix Client Deck — MRV Platform Overview",
  description:
    "Professional 16:9 presentation deck for Aranyix: plantation MRV, carbon, biodiversity, compliance and monitoring.",
  robots: "noindex, nofollow",
};

export default function PresentationLayout({ children }: { children: React.ReactNode }) {
  return <div className="presentation-layout">{children}</div>;
}
