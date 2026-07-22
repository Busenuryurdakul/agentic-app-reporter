"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/layout/empty-state";
import { tr } from "@/lib/i18n/tr";

type PlaceholderPageProps = {
  orgId: string;
  workspaceId: string;
  title: string;
  description: string;
  phase: string;
};

export function PlaceholderPage({
  orgId,
  workspaceId,
  title,
  description,
  phase,
}: PlaceholderPageProps) {
  return (
    <DashboardShell
      orgId={orgId}
      workspaceId={workspaceId}
      title={title}
      breadcrumbs={[
        { label: tr.common.organizations, href: "/organizations" },
        { label: tr.common.workspaces, href: `/o/${orgId}/workspaces` },
        { label: title },
      ]}
    >
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      <EmptyState
        title={tr.placeholder.arrivesIn(title, phase)}
        description={tr.placeholder.wired}
      />
    </DashboardShell>
  );
}
