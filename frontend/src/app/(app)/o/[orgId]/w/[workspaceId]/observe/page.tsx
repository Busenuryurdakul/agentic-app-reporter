"use client";

import { useParams } from "next/navigation";
import { ObservePage } from "@/features/observe/observe-page";

export default function ObserveRoutePage() {
  const params = useParams<{ orgId: string; workspaceId: string }>();
  return <ObservePage orgId={params.orgId} workspaceId={params.workspaceId} />;
}
