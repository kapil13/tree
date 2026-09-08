import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./presentation-deck.css";
import "./gov-ppt.css";
import "./pitch-deck.css";
import "./institutional-deck.css";

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
  title: "Aranyix Institutional Briefing — Plantation Intelligence Platform",
  description:
    "33-slide institutional presentation: field MRV, always-on scan engine, intelligence fusion, India scheme depth, compliance universe, and integrity anti-fraud.",
  robots: "noindex, nofollow",
};

export default function PresentationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`presentation-layout ${dmSans.variable} ${playfair.variable}`}>{children}</div>
  );
}
