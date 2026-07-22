"use client";

import type { ReactNode } from "react";
import { AppBreadcrumbs, type Crumb } from "@/components/layout/app-breadcrumbs";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";

type DashboardShellProps = {
  orgId: string;
  workspaceId?: string;
  workspaceName?: string;
  title?: string;
  breadcrumbs?: Crumb[];
  children: ReactNode;
};

export function DashboardShell({
  orgId,
  workspaceId,
  workspaceName,
  title,
  breadcrumbs,
  children,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.08),_transparent_32%),linear-gradient(180deg,#f7f8f8_0%,#eef1f1_100%)]">
      <div className="hidden md:block">
        <AppSidebar orgId={orgId} workspaceId={workspaceId} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          orgId={orgId}
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          title={title}
        />
        <main className="flex-1 px-4 py-6 md:px-8">
          {breadcrumbs?.length ? (
            <div className="mb-4">
              <AppBreadcrumbs items={breadcrumbs} />
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
