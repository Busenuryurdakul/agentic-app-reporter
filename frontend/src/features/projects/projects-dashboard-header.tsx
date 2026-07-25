"use client";

import { CheckCircle2, FileText, FolderKanban, Gauge, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { tr } from "@/lib/i18n/tr";

type ProjectsDashboardHeaderProps = {
  projectCount: number;
  averageReadiness: number | null;
  totalDocuments: number;
  succeededDocuments: number;
  failedDocuments: number;
  metricsLoading?: boolean;
};

function StatTile({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      )}
    </div>
  );
}

export function ProjectsDashboardHeader({
  projectCount,
  averageReadiness,
  totalDocuments,
  succeededDocuments,
  failedDocuments,
  metricsLoading,
}: ProjectsDashboardHeaderProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{tr.org.dashboardTitle}</CardTitle>
        <CardDescription>{tr.org.dashboardHint}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile
            label={tr.org.dashboardProjects}
            value={String(projectCount)}
            icon={<FolderKanban className="size-3.5" />}
          />
          <StatTile
            label={tr.org.dashboardAvgReadiness}
            value={averageReadiness == null ? "—" : `${averageReadiness}%`}
            icon={<Gauge className="size-3.5" />}
            loading={metricsLoading}
          />
          <StatTile
            label={tr.org.dashboardDocuments}
            value={String(totalDocuments)}
            icon={<FileText className="size-3.5" />}
            loading={metricsLoading}
          />
          <StatTile
            label={tr.org.dashboardSucceeded}
            value={String(succeededDocuments)}
            icon={<CheckCircle2 className="size-3.5 text-teal-700" />}
            loading={metricsLoading}
          />
          <StatTile
            label={tr.org.dashboardFailed}
            value={String(failedDocuments)}
            icon={<XCircle className="size-3.5 text-destructive/80" />}
            loading={metricsLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
