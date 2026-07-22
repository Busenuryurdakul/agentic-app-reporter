"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, getErrorMessage } from "@/lib/api/errors";
import { documentsApi, type DocumentSummary } from "@/lib/api/documents";
import { workspacesApi } from "@/lib/api/workspaces";
import { tr } from "@/lib/i18n/tr";

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

export function GeneratePage({
  orgId,
  workspaceId,
}: {
  orgId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<"workspace" | "tr" | "en">("workspace");

  const workspaceQuery = useQuery({
    queryKey: ["workspace", orgId, workspaceId],
    queryFn: () => workspacesApi.get(orgId, workspaceId),
  });

  const healthQuery = useQuery({
    queryKey: ["llm-health"],
    queryFn: () => documentsApi.health(),
    retry: false,
    refetchInterval: 60_000,
  });

  const documentsQuery = useQuery({
    queryKey: ["documents", workspaceId],
    queryFn: () => documentsApi.list(workspaceId),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      documentsApi.generate(workspaceId, {
        title: title.trim() || undefined,
        language: language === "workspace" ? undefined : language,
      }),
    onSuccess: async (doc) => {
      toast.success(tr.generate.created);
      await queryClient.invalidateQueries({ queryKey: ["documents", workspaceId] });
      router.push(`/o/${orgId}/w/${workspaceId}/generate/${doc.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error(tr.generate.inProgress);
        return;
      }
      toast.error(getErrorMessage(error, tr.generate.createFailed));
    },
  });

  function onGenerate() {
    if (generateMutation.isPending) return;
    generateMutation.mutate();
  }

  const workspaceName = workspaceQuery.data?.name;
  const documents = documentsQuery.data?.documents ?? [];
  const health = healthQuery.data;
  const isLoading = documentsQuery.isLoading;
  const isError = documentsQuery.isError;

  return (
    <DashboardShell
      orgId={orgId}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      title={tr.generate.title}
      breadcrumbs={[
        { label: tr.common.organizations, href: "/organizations" },
        { label: tr.common.workspaces, href: `/o/${orgId}/workspaces` },
        {
          label: workspaceName ?? tr.generate.title,
          href: `/o/${orgId}/w/${workspaceId}/plan`,
        },
        { label: tr.generate.title },
      ]}
    >
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tr.generate.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {tr.generate.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {healthQuery.isLoading ? (
            <Badge variant="outline">{tr.generate.healthChecking}</Badge>
          ) : healthQuery.isError ? (
            <Badge variant="destructive">{tr.generate.healthFail}</Badge>
          ) : health?.healthy ? (
            <Badge className="bg-teal-700 text-white hover:bg-teal-700">
              {tr.generate.healthOk(health.provider)}
            </Badge>
          ) : (
            <Badge variant="destructive">
              {tr.generate.healthFailDetail(health?.provider ?? "llm", health?.message ?? "")}
            </Badge>
          )}
        </div>
      </div>

      <Card className="mb-6 border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{tr.generate.createTitle}</CardTitle>
          <CardDescription>{tr.generate.createHint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="doc-title">{tr.generate.titleField}</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tr.generate.titlePlaceholder}
              disabled={generateMutation.isPending}
            />
          </div>
          <div className="grid w-full gap-2 md:w-48">
            <Label>{tr.generate.languageField}</Label>
            <Select
              value={language}
              onValueChange={(v) => setLanguage(v as "workspace" | "tr" | "en")}
              disabled={generateMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workspace">{tr.generate.languageWorkspace}</SelectItem>
                <SelectItem value="tr">{tr.plan.documentLanguageOptions.tr}</SelectItem>
                <SelectItem value="en">{tr.plan.documentLanguageOptions.en}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={onGenerate}
            disabled={generateMutation.isPending}
            className="md:min-w-40"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {tr.generate.creating}
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                {tr.generate.create}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title={tr.generate.loadFailed}
          description={getErrorMessage(documentsQuery.error, tr.generate.loadFailed)}
          action={
            <Button variant="outline" onClick={() => documentsQuery.refetch()}>
              {tr.common.retry}
            </Button>
          }
        />
      ) : documents.length === 0 ? (
        <EmptyState
          title={tr.generate.emptyTitle}
          description={tr.generate.emptyDescription}
          icon={<FileText className="size-5" />}
        />
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {tr.generate.listTitle}
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-background/80">
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                href={`/o/${orgId}/w/${workspaceId}/generate/${doc.id}`}
              />
            ))}
          </ul>
        </div>
      )}
    </DashboardShell>
  );
}

function DocumentRow({ doc, href }: { doc: DocumentSummary; href: string }) {
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
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{doc.language.toUpperCase()}</Badge>
          <Badge variant={doc.status === "succeeded" ? "secondary" : "destructive"}>
            {statusLabel(doc.status)}
          </Badge>
        </div>
      </Link>
    </li>
  );
}
