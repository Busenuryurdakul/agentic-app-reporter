"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api/errors";
import type { ProductSpecReadinessResult } from "@/lib/api/documents";
import { tr } from "@/lib/i18n/tr";

type ProductSpecReadinessPanelProps = {
  orgId: string;
  workspaceId: string;
  enabled: boolean;
  data?: ProductSpecReadinessResult;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
};

export function ProductSpecReadinessPanel({
  orgId,
  workspaceId,
  enabled,
  data,
  isLoading,
  isError,
  error,
  onRetry,
}: ProductSpecReadinessPanelProps) {
  if (!enabled) {
    return null;
  }

  const planHref = `/o/${orgId}/w/${workspaceId}/plan`;
  const questionnaireHref = `/o/${orgId}/w/${workspaceId}/questionnaire`;

  if (isLoading) {
    return (
      <Card className="mb-6 border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{tr.generate.readinessPanelTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="mb-6 border-destructive/40 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{tr.generate.readinessPanelTitle}</CardTitle>
          <CardDescription>{tr.generate.readinessLoadFailed}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            {getErrorMessage(error, tr.generate.readinessLoadFailed)}
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            {tr.common.retry}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const topWarnings = data.warnings.slice(0, 5);
  const hasBlocking = data.blocking_issues.length > 0;

  return (
    <Card className="mb-6 border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{tr.generate.readinessPanelTitle}</CardTitle>
        <CardDescription>{tr.generate.readinessPanelHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{tr.generate.readinessScoreLabel}: </span>
            <span className="font-medium">{data.readiness_score}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">{tr.generate.missingRequiredLabel}: </span>
            <span className="font-medium">{data.missing_required_count}</span>
          </div>
        </div>

        {hasBlocking ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {tr.generate.readinessBlockingTitle}
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm text-destructive/90">
              {data.blocking_issues.map((issue) => (
                <li key={issue.code}>{issue.message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {topWarnings.length > 0 ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
              <AlertTriangle className="size-4 shrink-0" />
              {tr.generate.readinessWarningsTitle}
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {topWarnings.map((issue) => (
                <li key={`${issue.code}-${issue.field ?? issue.message}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{tr.generate.readinessLooksGood}</p>
        )}

        <p className="text-xs text-muted-foreground">{tr.generate.readinessContinueHint}</p>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={planHref}>{tr.generate.readinessPlanLink}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={questionnaireHref}>{tr.generate.readinessQuestionnaireLink}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function productSpecGenerateDisabled(
  documentType: string,
  isLoading: boolean,
  readiness?: ProductSpecReadinessResult,
): boolean {
  if (documentType !== "product_spec") {
    return false;
  }
  if (isLoading || !readiness) {
    return false;
  }
  return !readiness.can_generate;
}

export function ProductSpecReadinessLoadingBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Loader2 className="size-3 animate-spin" />
    </span>
  );
}
