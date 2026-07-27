"use client";

import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/layout/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LlmSettingsTab } from "@/features/settings/llm-settings-tab";
import { tr } from "@/lib/i18n/tr";

export function SettingsPageContent() {
  const params = useParams<{ orgId: string; workspaceId: string }>();
  const orgId = params.orgId;
  const workspaceId = params.workspaceId;

  // org_admin has llm:write; other roles can read effective settings.
  // Until role claims are exposed in /me, allow edit attempts — backend enforces llm:write.
  const canWrite = true;

  return (
    <DashboardShell
      orgId={orgId}
      workspaceId={workspaceId}
      title={tr.placeholder.settingsTitle}
      breadcrumbs={[
        { label: tr.common.organizations, href: "/organizations" },
        { label: tr.common.workspaces, href: `/o/${orgId}/workspaces` },
        { label: tr.placeholder.settingsTitle },
      ]}
    >
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {tr.placeholder.settingsTitle}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {tr.placeholder.settingsDescription}
        </p>
      </div>

      <Tabs defaultValue="llm" className="space-y-6">
        <TabsList>
          <TabsTrigger value="llm">{tr.llmSettings.tabLabel}</TabsTrigger>
          <TabsTrigger value="members">{tr.llmSettings.membersTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="llm">
          <LlmSettingsTab orgId={orgId} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="members">
          <EmptyState
            title={tr.llmSettings.membersTab}
            description={tr.llmSettings.membersComingSoon}
          />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
