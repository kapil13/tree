"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  Leaf,
  Minimize,
  Printer,
} from "lucide-react";
import { DECK_SLIDE_COUNT, DeckSlides } from "./deck-slides";
import { cn } from "@/lib/cn";

export function DeckViewer() {
  const [current, setCurrent] = useState(0);
  const [printAll, setPrintAll] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const go = useCallback((n: number) => {
    setCurrent(Math.max(0, Math.min(DECK_SLIDE_COUNT - 1, n)));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        go(current + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(current - 1);
      } else if (e.key === "Home") go(0);
      else if (e.key === "End") go(DECK_SLIDE_COUNT - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, go]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const handlePrint = () => {
    setPrintAll(true);
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => setPrintAll(false), 1000);
    });
  };

  return (
    <div ref={containerRef} className={cn("deck-root min-h-screen", fullscreen && "bg-black")}>
      <header className="deck-no-print sticky top-0 z-50 border-b border-white/10 bg-[#041f17]/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-emerald-50">
            <Leaf className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-semibold">Aranyix Client Deck</span>
            <span className="hidden text-xs text-emerald-200/50 sm:inline">16:9 · {DECK_SLIDE_COUNT} slides</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-200/70">
              {current + 1} / {DECK_SLIDE_COUNT}
            </span>
            <button
              type="button"
              onClick={() => go(current - 1)}
              disabled={current === 0}
              className="rounded-lg border border-white/10 p-2 text-emerald-100 hover:bg-white/10 disabled:opacity-30"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(current + 1)}
              disabled={current === DECK_SLIDE_COUNT - 1}
              className="rounded-lg border border-white/10 p-2 text-emerald-100 hover:bg-white/10 disabled:opacity-30"
              aria-label="Next slide"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-lg border border-white/10 p-2 text-emerald-100 hover:bg-white/10"
              aria-label="Fullscreen"
            >
              {fullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              <Printer className="h-3.5 w-3.5" />
              Save as PDF
            </button>
          </div>
        </div>
        <div className="mx-auto mt-2 flex max-w-[1280px] flex-wrap justify-center gap-1">
          {Array.from({ length: DECK_SLIDE_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === current ? "w-4 bg-emerald-400" : "w-1.5 bg-white/20 hover:bg-white/40",
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </header>

      <div id="deck-print-root" className="mx-auto px-4 py-8">
        {printAll ? <DeckSlides /> : <DeckSlides onlySlide={current + 1} />}
      </div>

      <div className="deck-no-print mx-auto max-w-[1280px] px-4 pb-8 text-center text-xs text-emerald-200/40">
        <Download className="mx-auto mb-1 h-4 w-4" />
        Save as PDF: click button above · Ctrl+P · Landscape · Margins: None · Background graphics: On
      </div>
    </div>
  );
}
