"use client";

import { useParams } from "next/navigation";
import { PlaceholderPage } from "@/features/workspaces/placeholder-page";
import { tr } from "@/lib/i18n/tr";

export default function SettingsPage() {
  const params = useParams<{ orgId: string; workspaceId: string }>();

  return (
    <PlaceholderPage
      orgId={params.orgId}
      workspaceId={params.workspaceId}
      title={tr.placeholder.settingsTitle}
      description={tr.placeholder.settingsDescription}
      phase="5"
    />
  );
}
