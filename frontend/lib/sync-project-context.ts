"use client";

import { useEffect } from "react";
import { useProjectContext } from "@/lib/project-context";

/** Keep the global project picker aligned with the active project workspace route. */
export function useSyncProjectContextFromRoute(projectId: string | undefined) {
  const { setProjectId } = useProjectContext();

  useEffect(() => {
    if (!projectId) return;
    setProjectId(projectId);
  }, [projectId, setProjectId]);
}
