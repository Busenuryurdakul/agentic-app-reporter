"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, FileText, Loader2, Telescope } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, getErrorMessage } from "@/lib/api/errors";
import { exportsApi } from "@/lib/api/exports";
import {
  observeApi,
  type DocumentQuality,
  type RecentDocumentSummary,
} from "@/lib/api/observe";
import { workspacesApi } from "@/lib/api/workspaces";
import { tr } from "@/lib/i18n/tr";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusLabel(status: string) {
  if (status === "succeeded") return tr.generate.statusSucceeded;
  if (status === "failed") return tr.generate.statusFailed;
  if (status === "pending") return tr.generate.statusPending;
  return status;
}

function approvalLabel(status?: string) {
  if (status === "approved") return tr.generate.approvalApproved;
  if (status === "rejected") return tr.generate.approvalRejected;
  return tr.generate.approvalDraft;
}

function qualityTone(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 80) return "default";
  if (score >= 40) return "secondary";
  if (score > 0) return "outline";
  return "destructive";
}

export function ObservePage({
  orgId,
  workspaceId,
}: {
  orgId: string;
  workspaceId: string;
}) {
  const workspaceQuery = useQuery({
    queryKey: ["workspace", orgId, workspaceId],
    queryFn: () => workspacesApi.get(orgId, workspaceId),
  });

  const readinessQuery = useQuery({
    queryKey: ["readiness", workspaceId],
    queryFn: () => observeApi.readiness(workspaceId),
  });

  const summaryQuery = useQuery({
    queryKey: ["observe-summary", workspaceId],
    queryFn: () => observeApi.summary(workspaceId),
  });

  const exportMutation = useMutation({
    mutationFn: () => exportsApi.create(workspaceId),
    onSuccess: () => {
      toast.success(tr.observe.exported);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) {
        toast.error(tr.observe.exportEmpty);
        return;
      }
      toast.error(getErrorMessage(error, tr.observe.exportFailed));
    },
  });

  const workspaceName = workspaceQuery.data?.name;
  const readiness = readinessQuery.data;
  const summary = summaryQuery.data;
  const isLoading = readinessQuery.isLoading || summaryQuery.isLoading;
  const isError = readinessQuery.isError || summaryQuery.isError;
  const error = readinessQuery.error ?? summaryQuery.error;

  const generateHref = `/o/${orgId}/w/${workspaceId}/generate`;
  const planHref = `/o/${orgId}/w/${workspaceId}/plan`;
  const questionnairesHref = `/o/${orgId}/w/${workspaceId}/questionnaires`;

  return (
    <DashboardShell
      orgId={orgId}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      title={tr.observe.title}
      breadcrumbs={[
        { label: tr.common.organizations, href: "/organizations" },
        { label: tr.common.workspaces, href: `/o/${orgId}/workspaces` },
        {
          label: workspaceName ?? tr.observe.title,
          href: planHref,
        },
        { label: tr.observe.title },
      ]}
    >
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tr.observe.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {tr.observe.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={planHref}>{tr.observe.ctaPlan}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={questionnairesHref}>{tr.observe.ctaQuestionnaires}</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || isLoading || isError}
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {tr.observe.exporting}
              </>
            ) : (
              <>
                <Download className="size-4" />
                {tr.observe.ctaExport}
              </>
            )}
          </Button>
          <Button asChild>
            <Link href={generateHref}>{tr.observe.ctaGenerate}</Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title={tr.observe.loadFailed}
          description={getErrorMessage(error, tr.observe.loadFailed)}
          action={
            <Button
              variant="outline"
              onClick={() => {
                void readinessQuery.refetch();
                void summaryQuery.refetch();
              }}
            >
              {tr.common.retry}
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{tr.observe.readinessTitle}</CardTitle>
              <CardDescription>{tr.observe.readinessHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{tr.observe.overall}</span>
                <Badge variant={(readiness?.overall ?? 0) >= 80 ? "default" : "secondary"}>
                  {readiness?.overall ?? 0}%
                </Badge>
              </div>
              <Progress value={readiness?.overall ?? 0} />

              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tr.observe.componentsTitle}
                </p>
                {(
                  [
                    ["profile", readiness?.components.profile ?? 0],
                    ["questionnaire", readiness?.components.questionnaire ?? 0],
                    ["documents", readiness?.components.documents ?? 0],
                  ] as const
                ).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>{tr.observe.components[key]}</span>
                      <span className="text-muted-foreground">{value}%</span>
                    </div>
                    <Progress value={value} className="h-1" />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 pt-2 text-xs text-muted-foreground">
                <span>
                  {tr.observe.succeededDocs}: {readiness?.succeeded_document_count ?? 0}
                </span>
                <span>
                  {tr.observe.failedDocs}: {readiness?.failed_document_count ?? 0}
                </span>
                {readiness?.computed_at ? (
                  <span>
                    {tr.observe.computedAt}: {formatDate(readiness.computed_at)}
                  </span>
                ) : null}
              </div>

              {(readiness?.missing_required_questions?.length ?? 0) > 0 ? (
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs font-medium text-foreground">
                    {tr.observe.missingTitle(readiness!.missing_required_questions.length)}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {readiness!.missing_required_questions.slice(0, 6).map((q) => (
                      <li key={q.question_id}>
                        {q.title}
                        {q.category ? ` · ${q.category}` : ""}
                      </li>
                    ))}
                  </ul>
                  {readiness!.missing_required_questions.length > 6 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {tr.observe.missingMore(
                        readiness!.missing_required_questions.length - 6,
                      )}
                    </p>
                  ) : null}
                  <Button asChild variant="link" className="mt-1 h-auto px-0 text-xs">
                    <Link href={questionnairesHref}>{tr.observe.ctaQuestionnaires}</Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{tr.observe.summaryTitle}</CardTitle>
              <CardDescription>{tr.observe.summaryHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {tr.observe.totalsSucceeded}: {summary?.totals.succeeded ?? 0}
                </Badge>
                <Badge variant="destructive">
                  {tr.observe.totalsFailed}: {summary?.totals.failed ?? 0}
                </Badge>
                <Badge variant="outline">
                  {tr.observe.totalsPending}: {summary?.totals.pending ?? 0}
                </Badge>
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <p>
                  {tr.observe.lastSuccess}: {formatDate(summary?.last_success_at)}
                </p>
                <p>
                  {tr.observe.lastFailure}: {formatDate(summary?.last_failure_at)}
                </p>
              </div>
              {(summary?.providers?.length ?? 0) > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {summary!.providers.map((p) => (
                    <Badge key={p.name || "unknown"} variant="outline">
                      {p.name || tr.observe.unknownProvider} · {p.count}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {tr.observe.recentTitle}
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href={generateHref}>{tr.observe.viewAllDocuments}</Link>
              </Button>
            </div>

            {(summary?.recent?.length ?? 0) === 0 ? (
              <EmptyState
                title={tr.observe.recentEmptyTitle}
                description={tr.observe.recentEmptyDescription}
                icon={<Telescope className="size-5" />}
                action={
                  <Button asChild>
                    <Link href={generateHref}>{tr.observe.ctaGenerate}</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border bg-background/80">
                {summary!.recent.map((doc) => (
                  <RecentRow
                    key={doc.id}
                    doc={doc}
                    href={`/o/${orgId}/w/${workspaceId}/generate/${doc.id}`}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </DashboardShell>
  );
}

function RecentRow({ doc, href }: { doc: RecentDocumentSummary; href: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/40 md:flex-row md:items-center md:justify-between"
      >
        <div className="min-w-0">
          <p className="truncate font-medium tracking-tight">{doc.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(doc.created_at)}
            {doc.provider_name ? ` · ${doc.provider_name}` : ""}
            {doc.model_name ? ` / ${doc.model_name}` : ""}
          </p>
          <QualityBadges quality={doc.quality} />
        </div>
        <div className="flex items-center gap-2">
          {doc.language ? (
            <Badge variant="outline">{doc.language.toUpperCase()}</Badge>
          ) : null}
          <Badge variant={doc.status === "succeeded" ? "secondary" : "destructive"}>
            {statusLabel(doc.status)}
          </Badge>
          <Badge variant={doc.approval_status === "approved" ? "default" : "outline"}>
            {approvalLabel(doc.approval_status)}
          </Badge>
          <Badge variant={qualityTone(doc.quality?.quality_score ?? 0)}>
            {tr.observe.qualityScore(doc.quality?.quality_score ?? 0)}
          </Badge>
          <FileText className="hidden size-4 text-muted-foreground md:block" />
        </div>
      </Link>
    </li>
  );
}

function QualityBadges({ quality }: { quality?: DocumentQuality }) {
  if (!quality) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      <Badge variant={quality.has_heading ? "secondary" : "outline"} className="text-[10px]">
        {quality.has_heading ? tr.observe.qualityHasHeading : tr.observe.qualityNoHeading}
      </Badge>
      <Badge variant={quality.min_length_ok ? "secondary" : "outline"} className="text-[10px]">
        {quality.min_length_ok ? tr.observe.qualityLengthOk : tr.observe.qualityLengthShort}
      </Badge>
      <Badge
        variant={quality.language_declared ? "secondary" : "outline"}
        className="text-[10px]"
      >
        {quality.language_declared
          ? tr.observe.qualityLanguageOk
          : tr.observe.qualityLanguageMissing}
      </Badge>
    </div>
  );
}
