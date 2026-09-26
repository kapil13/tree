"use client";

import { ProjectSetupWizard } from "@/components/projects/project-setup-wizard";
import { useParams } from "next/navigation";

export default function ProjectSetupPage() {
  const params = useParams();
  const projectId = params.id as string;
  return <ProjectSetupWizard projectId={projectId} />;
}
