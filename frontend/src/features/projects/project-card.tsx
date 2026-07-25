"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { ObserveSummaryResult, ReadinessResult } from "@/lib/api/observe";
import type { ProfileInfo } from "@/lib/api/profile";
import type { Organization, Workspace } from "@/lib/api/types";
import {
  extractPlatforms,
  extractTechnologies,
  resolveProjectStatusKey,
} from "@/features/projects/extract-profile-display";
import {
  formatRelativeTime,
  latestTimestamp,
} from "@/features/projects/format-relative-time";
import { tr } from "@/lib/i18n/tr";
import { cn } from "@/lib/utils";

export type ProjectCardData = Workspace & {
  organization: Organization;
};

type ProjectCardProps = {
  project: ProjectCardData;
  profile?: ProfileInfo | null;
  readiness?: ReadinessResult | null;
  summary?: ObserveSummaryResult | null;
  isLoading?: boolean;
  onNavigate?: () => void;
};

function statusLabel(statusKey: string) {
  const options = tr.plan.projectStatusOptions as Record<string, string>;
  return options[statusKey] ?? statusKey;
}

function documentStatusLabel(status: string) {
  if (status === "succeeded") return tr.generate.statusSucceeded;
  if (status === "failed") return tr.generate.statusFailed;
  if (status === "pending") return tr.generate.statusPending;
  return status;
}

export function ProjectCard({
  project,
  profile,
  readiness,
  summary,
  isLoading,
  onNavigate,
}: ProjectCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const orgId = project.organization.id;
  const workspaceId = project.id;
  const baseHref = `/o/${orgId}/w/${workspaceId}`;
  const planHref = `${baseHref}/plan`;
  const questionnairesHref = `${baseHref}/questionnaires`;
  const generateHref = `${baseHref}/generate`;
  const observeHref = `${baseHref}/observe`;

  const description =
    profile?.project_description?.trim() ||
    project.description?.trim() ||
    tr.workspace.noDescription;

  const platforms = profile ? extractPlatforms(profile) : [];
  const technologies = profile ? extractTechnologies(profile, 6) : [];
  const statusKey = resolveProjectStatusKey(profile, project.status);

  const totalDocuments = summary
    ? summary.totals.succeeded + summary.totals.failed + summary.totals.pending
    : readiness
      ? readiness.succeeded_document_count + readiness.failed_document_count
      : null;

  const readinessScore = readiness?.overall ?? null;
  const readinessPending = isLoading || readinessScore == null;

  const lastDocument = summary?.recent[0] ?? null;
  const lastUpdated = latestTimestamp(
    project.updated_at,
    profile?.updated_at,
    lastDocument?.updated_at,
  );

  const missing = readiness?.missing_required_questions ?? [];
  const hasDetails =
    Boolean(readiness) ||
    missing.length > 0 ||
    Boolean(lastDocument) ||
    (summary && summary.totals.failed > 0);

  if (isLoading && !profile && !readiness && !summary) {
    return (
      <Card className="border-border/80">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-2 border-t border-border/60 bg-muted/10 px-6 py-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 transition-colors hover:border-teal-700/20">
      <CardHeader className="gap-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-lg">
              <Link
                href={planHref}
                className="hover:text-teal-900 hover:underline"
                onClick={() => onNavigate?.()}
              >
                {project.name}
              </Link>
            </CardTitle>
            <CardDescription className="line-clamp-2">{description}</CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {statusLabel(statusKey)}
          </Badge>
        </div>

        {platforms.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {platforms.map((platform) => (
              <Badge key={platform} variant="outline" className="text-xs font-normal">
                {platform}
              </Badge>
            ))}
          </div>
        ) : null}

        {technologies.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {technologies.map((tech) => (
              <span
                key={tech}
                className="rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">{tr.org.cardReadiness}</span>
            {readinessPending ? (
              <Skeleton className="h-3.5 w-8" />
            ) : (
              <span className="tabular-nums text-muted-foreground">{readinessScore}%</span>
            )}
          </div>
          {readinessPending ? (
            <Skeleton className="h-1.5 w-full" />
          ) : (
            <Progress value={readinessScore} className="h-1.5" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            {tr.org.cardDocuments}:{" "}
            <span className="font-medium tabular-nums text-foreground">
              {totalDocuments == null ? "—" : totalDocuments}
            </span>
          </span>
          <span className="text-border">·</span>
          <span>
            {tr.org.cardLastUpdated}:{" "}
            <span className="font-medium text-foreground">
              {formatRelativeTime(lastUpdated)}
            </span>
          </span>
        </div>

        {hasDetails ? (
          <div className="pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => setDetailsOpen((open) => !open)}
              aria-expanded={detailsOpen}
            >
              {tr.org.cardDetails}
              <ChevronDown
                className={cn("ml-1 size-3.5 transition-transform", detailsOpen && "rotate-180")}
              />
            </Button>

            {detailsOpen ? (
              <div className="mt-2 space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                {readiness ? (
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{tr.org.cardCompleted}</span>
                    <span className="font-medium tabular-nums">
                      {readiness.total_answered}/{readiness.total_required}
                    </span>
                  </div>
                ) : null}

                {summary ? (
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="text-teal-800">
                      {tr.org.cardSucceeded}: {summary.totals.succeeded}
                    </span>
                    <span className="text-destructive/90">
                      {tr.org.cardFailed}: {summary.totals.failed}
                    </span>
                  </div>
                ) : null}

                {missing.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-foreground">{tr.org.cardMissing}</p>
                    <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                      {missing.slice(0, 5).map((question) => (
                        <li key={question.question_id}>{question.title}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {lastDocument ? (
                  <div>
                    <p className="text-xs font-medium text-foreground">{tr.org.cardLastDocument}</p>
                    <p className="mt-1 truncate text-sm">{lastDocument.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {documentStatusLabel(lastDocument.status)}
                      {lastDocument.provider_name ? ` · ${lastDocument.provider_name}` : ""}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{tr.org.cardNoDocuments}</p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="grid grid-cols-2 gap-2 border-t border-border/60 bg-muted/10 px-6 py-3 sm:grid-cols-4">
        <Button asChild variant="outline" size="sm" onClick={() => onNavigate?.()}>
          <Link href={planHref}>{tr.nav.plan}</Link>
        </Button>
        <Button asChild variant="outline" size="sm" onClick={() => onNavigate?.()}>
          <Link href={questionnairesHref}>{tr.nav.questionnaires}</Link>
        </Button>
        <Button asChild variant="outline" size="sm" onClick={() => onNavigate?.()}>
          <Link href={generateHref}>{tr.nav.generate}</Link>
        </Button>
        <Button
          asChild
          size="sm"
          className="bg-teal-800 hover:bg-teal-900"
          onClick={() => onNavigate?.()}
        >
          <Link href={observeHref}>{tr.nav.observe}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
