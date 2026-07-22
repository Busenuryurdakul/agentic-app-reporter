"use client";

import { useParams } from "next/navigation";
import { GeneratePage } from "@/features/generate/generate-page";

export default function GenerateRoutePage() {
  const params = useParams<{ orgId: string; workspaceId: string }>();

  return <GeneratePage orgId={params.orgId} workspaceId={params.workspaceId} />;
}
