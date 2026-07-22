"use client";

import { useParams } from "next/navigation";
import { ProjectProfilePage } from "@/features/plan/project-profile-page";

export default function PlanPage() {
  const params = useParams<{ orgId: string; workspaceId: string }>();

  return <ProjectProfilePage orgId={params.orgId} workspaceId={params.workspaceId} />;
}
