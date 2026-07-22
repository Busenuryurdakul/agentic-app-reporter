"use client";

import { useParams } from "next/navigation";
import { PlaceholderPage } from "@/features/workspaces/placeholder-page";
import { tr } from "@/lib/i18n/tr";

export default function ObservePage() {
  const params = useParams<{ orgId: string; workspaceId: string }>();

  return (
    <PlaceholderPage
      orgId={params.orgId}
      workspaceId={params.workspaceId}
      title={tr.placeholder.observeTitle}
      description={tr.placeholder.observeDescription}
      phase="4"
    />
  );
}
