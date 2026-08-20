"use client";

import { useEffect } from "react";

export type PlatformHotkey = {
  keys: string;
  description: string;
  handler?: () => void;
};

const GLOBAL_HOTKEYS: PlatformHotkey[] = [
  { keys: "?", description: "Show keyboard shortcuts" },
  { keys: "G then O", description: "Go to overview" },
  { keys: "G then U", description: "Go to users" },
  { keys: "G then R", description: "Go to organizations" },
  { keys: "G then A", description: "Go to audit log" },
  { keys: "G then G", description: "Go to governance" },
];

export function usePlatformHotkeys(
  pageHotkeys: PlatformHotkey[] = [],
  onShowHelp: () => void,
) {
  useEffect(() => {
    let gPending = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const clearG = () => {
      gPending = false;
      if (gTimer) clearTimeout(gTimer);
      gTimer = null;
    };

    const navigate = (path: string) => {
      window.location.href = path;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) {
        return;
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        onShowHelp();
        return;
      }

      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!gPending) {
          gPending = true;
          gTimer = setTimeout(clearG, 1200);
          return;
        }
      }

      if (gPending) {
        clearG();
        const map: Record<string, string> = {
          o: "/platform",
          u: "/platform/users",
          r: "/platform/organizations",
          a: "/platform/audit",
          g: "/platform/governance",
        };
        const path = map[e.key.toLowerCase()];
        if (path) {
          e.preventDefault();
          navigate(path);
          return;
        }
      }

      for (const hk of pageHotkeys) {
        if (!hk.handler) continue;
        const parts = hk.keys.toLowerCase().split("+").map((p) => p.trim());
        const needMeta = parts.includes("meta") || parts.includes("cmd");
        const needCtrl = parts.includes("ctrl");
        const key = parts[parts.length - 1];
        const metaOk = needMeta ? e.metaKey || e.ctrlKey : !e.metaKey && !e.ctrlKey;
        const ctrlOk = needCtrl ? e.ctrlKey : true;
        if (metaOk && ctrlOk && e.key.toLowerCase() === key) {
          e.preventDefault();
          hk.handler();
          return;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearG();
    };
  }, [pageHotkeys, onShowHelp]);
}

export function getGlobalHotkeys(): PlatformHotkey[] {
  return GLOBAL_HOTKEYS;
}
