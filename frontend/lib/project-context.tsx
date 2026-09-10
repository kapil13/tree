"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { plantingProjects, type PlantingProject } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { scopedKey } from "@/lib/query-keys";

const STORAGE_KEY = "aranyix_active_project_id";

export type ProjectContextValue = {
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  projects: PlantingProject[];
  selectedProject: PlantingProject | undefined;
  isLoading: boolean;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectContextProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projectId, setProjectIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setProjectIdState(stored || null);
    setHydrated(true);
  }, []);

  const setProjectId = useCallback((id: string | null) => {
    setProjectIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: scopedKey(user, "project-context-list"),
    queryFn: () => plantingProjects.list(),
    enabled: Boolean(user),
  });

  const projects = data?.items ?? [];

  useEffect(() => {
    if (!hydrated || !projectId || projects.length === 0) return;
    if (!projects.some((p) => p.id === projectId)) {
      setProjectId(null);
    }
  }, [hydrated, projectId, projects, setProjectId]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId],
  );

  const value = useMemo(
    () => ({
      projectId: hydrated ? projectId : null,
      setProjectId,
      projects,
      selectedProject,
      isLoading,
    }),
    [hydrated, projectId, setProjectId, projects, selectedProject, isLoading],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProjectContext must be used within ProjectContextProvider");
  }
  return ctx;
}

export function useOptionalProjectContext(): ProjectContextValue | null {
  return useContext(ProjectContext);
}
