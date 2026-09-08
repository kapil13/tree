import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "../presentation/presentation-deck.css";
import "../presentation/gov-ppt.css";
import "../presentation/pitch-deck.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-deck-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-deck-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aranyix Professional Briefing — Full Deck",
  description:
    "26-slide professional briefing for Aranyix: plantation MRV, satellite monitoring, carbon, biodiversity, compliance and audit-ready evidence.",
  robots: "noindex, nofollow",
};

export default function PresentationaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`presentation-layout ${dmSans.variable} ${playfair.variable}`}>{children}</div>
  );
}
