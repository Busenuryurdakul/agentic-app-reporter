"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Download, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, getErrorMessage } from "@/lib/api/errors";
import { documentsApi } from "@/lib/api/documents";
import { exportsApi } from "@/lib/api/exports";
import { workspacesApi } from "@/lib/api/workspaces";
import { tr } from "@/lib/i18n/tr";
import { useRegisterLlmActive } from "@/features/generate/llm-active-context";

function formatDate(value: string) {
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

/** Allow only http(s)/mailto links in rendered Markdown. */
function safeHref(href?: string): string | undefined {
  if (!href) return undefined;
  const trimmed = href.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
      return trimmed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function DocumentViewer({
  orgId,
  workspaceId,
  documentId,
}: {
  orgId: string;
  workspaceId: string;
  documentId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const workspaceQuery = useQuery({
    queryKey: ["workspace", orgId, workspaceId],
    queryFn: () => workspacesApi.get(orgId, workspaceId),
  });

  const documentQuery = useQuery({
    queryKey: ["document", workspaceId, documentId],
    queryFn: () => documentsApi.get(workspaceId, documentId),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => documentsApi.regenerate(workspaceId, documentId),
    onSuccess: async (doc) => {
      toast.success(tr.generate.regenerated);
      await queryClient.invalidateQueries({ queryKey: ["documents", workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["observe-summary", workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["readiness", workspaceId] });
      router.push(`/o/${orgId}/w/${workspaceId}/generate/${doc.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error(tr.generate.inProgress);
        return;
      }
      toast.error(getErrorMessage(error, tr.generate.regenerateFailed));
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => documentsApi.approve(workspaceId, documentId),
    onSuccess: async () => {
      toast.success(tr.generate.approved);
      await queryClient.invalidateQueries({ queryKey: ["document", workspaceId, documentId] });
      await queryClient.invalidateQueries({ queryKey: ["documents", workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["observe-summary", workspaceId] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400) {
        toast.error(tr.generate.approveOnlySucceeded);
        return;
      }
      toast.error(getErrorMessage(error, tr.generate.approveFailed));
    },
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      exportsApi.create(workspaceId, {
        document_ids: [documentId],
        format: "markdown_zip",
      }),
    onSuccess: () => {
      toast.success(tr.generate.exported);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, tr.generate.exportFailed));
    },
  });

  const busy =
    regenerateMutation.isPending ||
    approveMutation.isPending ||
    exportMutation.isPending;

  useRegisterLlmActive(regenerateMutation.isPending);

  function onRegenerate() {
    if (busy) return;
    regenerateMutation.mutate();
  }

  function onApprove() {
    if (busy) return;
    approveMutation.mutate();
  }

  function onExport() {
    if (busy) return;
    exportMutation.mutate();
  }

  const workspaceName = workspaceQuery.data?.name;
  const doc = documentQuery.data;
  const listHref = `/o/${orgId}/w/${workspaceId}/generate`;

  return (
    <DashboardShell
      orgId={orgId}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      title={doc?.title ?? tr.generate.viewerTitle}
      breadcrumbs={[
        { label: tr.common.organizations, href: "/organizations" },
        { label: tr.common.workspaces, href: `/o/${orgId}/workspaces` },
        {
          label: workspaceName ?? tr.generate.title,
          href: `/o/${orgId}/w/${workspaceId}/plan`,
        },
        { label: tr.generate.title, href: listHref },
        { label: doc?.title ?? tr.generate.viewerTitle },
      ]}
    >
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={listHref}>
            <ArrowLeft className="size-4" />
            {tr.generate.backToList}
          </Link>
        </Button>
      </div>

      {documentQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : documentQuery.isError || !doc ? (
        <EmptyState
          title={tr.generate.loadDocumentFailed}
          description={getErrorMessage(documentQuery.error, tr.generate.loadDocumentFailed)}
          action={
            <Button variant="outline" onClick={() => documentQuery.refetch()}>
              {tr.common.retry}
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(doc.created_at)}
                {doc.provider_name ? ` · ${doc.provider_name}` : ""}
                {doc.model_name ? ` / ${doc.model_name}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{doc.language.toUpperCase()}</Badge>
                <Badge variant={doc.status === "succeeded" ? "secondary" : "destructive"}>
                  {statusLabel(doc.status)}
                </Badge>
                <Badge
                  variant={doc.approval_status === "approved" ? "default" : "outline"}
                >
                  {approvalLabel(doc.approval_status)}
                </Badge>
              </div>
              {doc.error_message ? (
                <p className="mt-3 text-sm text-destructive">{doc.error_message}</p>
              ) : null}
              {doc.source_fingerprint ? (
                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                  {tr.generate.contextFingerprint}: {doc.source_fingerprint.slice(0, 16)}…
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {doc.status === "succeeded" ? (
                <Button onClick={onExport} disabled={busy} variant="outline">
                  {exportMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {tr.generate.exporting}
                    </>
                  ) : (
                    <>
                      <Download className="size-4" />
                      {tr.generate.export}
                    </>
                  )}
                </Button>
              ) : null}
              {doc.status === "succeeded" && doc.approval_status !== "approved" ? (
                <Button onClick={onApprove} disabled={busy} variant="secondary">
                  {approveMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {tr.generate.approving}
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      {tr.generate.approve}
                    </>
                  )}
                </Button>
              ) : null}
              <Button onClick={onRegenerate} disabled={busy}>
                {regenerateMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {tr.generate.regenerating}
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-4" />
                    {tr.generate.regenerate}
                  </>
                )}
              </Button>
            </div>
          </div>

          <article className="rounded-xl border border-border bg-background/90 px-5 py-6 shadow-sm md:px-8">
            <div className="markdown-body space-y-4 text-sm leading-relaxed text-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mt-6 text-xl font-semibold tracking-tight">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mt-4 text-lg font-semibold">{children}</h3>
                  ),
                  p: ({ children }) => <p className="text-muted-foreground">{children}</p>,
                  ul: ({ children }) => (
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">{children}</ol>
                  ),
                  li: ({ children }) => <li>{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  code: ({ children, className }) => {
                    const isBlock = Boolean(className);
                    if (isBlock) {
                      return (
                        <code className="block overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-xs text-foreground">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => <pre className="overflow-x-auto">{children}</pre>,
                  a: ({ href, children }) => {
                    const safe = safeHref(href);
                    if (!safe) {
                      return <span>{children}</span>;
                    }
                    return (
                      <a
                        href={safe}
                        className="font-medium text-teal-800 underline-offset-4 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    );
                  },
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border-b border-border px-2 py-1.5 font-semibold">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="border-b border-border/70 px-2 py-1.5 text-muted-foreground">
                      {children}
                    </td>
                  ),
                }}
              >
                {doc.markdown_body ||
                  (doc.status === "failed"
                    ? tr.generate.failedBodyHint
                    : tr.generate.emptyBody)}
              </ReactMarkdown>
            </div>
          </article>
        </>
      )}
    </DashboardShell>
  );
}
