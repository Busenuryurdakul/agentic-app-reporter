"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState } from "@/components/layout/empty-state";
import { getErrorMessage } from "@/lib/api/errors";
import { documentsApi } from "@/lib/api/documents";
import { observeApi } from "@/lib/api/observe";
import { organizationsApi } from "@/lib/api/organizations";
import { profileApi } from "@/lib/api/profile";
import { workspacesApi } from "@/lib/api/workspaces";
import type { Organization, Workspace } from "@/lib/api/types";
import {
  buildPreProjectProfile,
  type PreProjectInput,
} from "@/features/projects/build-pre-project-profile";
import { CreateProjectDialog } from "@/features/projects/create-project-dialog";
import { LlmHealthBadge } from "@/features/projects/llm-health-badge";
import { ProjectCard } from "@/features/projects/project-card";
import { ProjectsDashboardHeader } from "@/features/projects/projects-dashboard-header";
import { tr } from "@/lib/i18n/tr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type ProjectCardData = Workspace & {
  organization: Organization;
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 48) || "project";
}

export function OrganizationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setOrganization } = useAuth();
  const [open, setOpen] = useState(false);

  const orgsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: () => organizationsApi.list(),
  });

  const healthQuery = useQuery({
    queryKey: ["llm-health"],
    queryFn: () => documentsApi.health(),
    retry: false,
    refetchInterval: 60_000,
  });

  const organizations = orgsQuery.data?.data ?? [];

  const workspaceQueries = useQueries({
    queries: organizations.map((org) => ({
      queryKey: ["workspaces", org.id],
      queryFn: () => workspacesApi.list(org.id),
      enabled: orgsQuery.isSuccess,
    })),
  });

  const projects = useMemo(() => {
    const items: ProjectCardData[] = [];
    organizations.forEach((org, index) => {
      const workspaces = workspaceQueries[index]?.data ?? [];
      for (const workspace of workspaces) {
        items.push({ ...workspace, organization: org });
      }
    });
    return items;
  }, [organizations, workspaceQueries]);

  const profileQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: ["profile", project.organization.id, project.id],
      queryFn: () => profileApi.get(project.id, project.organization.id),
      enabled: projects.length > 0,
      staleTime: 60_000,
    })),
  });

  const readinessQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: ["readiness", project.organization.id, project.id],
      queryFn: () => observeApi.readiness(project.id, project.organization.id),
      enabled: projects.length > 0,
      staleTime: 60_000,
    })),
  });

  const summaryQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: ["observe-summary", project.organization.id, project.id],
      queryFn: () => observeApi.summary(project.id, 1, project.organization.id),
      enabled: projects.length > 0,
      staleTime: 60_000,
    })),
  });

  const workspacesLoading =
    orgsQuery.isSuccess &&
    organizations.length > 0 &&
    workspaceQueries.some((query) => query.isLoading);

  const cardDetailsLoading =
    projects.length > 0 &&
    (profileQueries.some((query) => query.isLoading) ||
      readinessQueries.some((query) => query.isLoading) ||
      summaryQueries.some((query) => query.isLoading));

  const workspacesError = workspaceQueries.find((query) => query.isError)?.error;

  const dashboardStats = useMemo(() => {
    const readinessValues = readinessQueries
      .map((query) => query.data?.overall)
      .filter((value): value is number => typeof value === "number");

    const averageReadiness =
      readinessValues.length > 0
        ? Math.round(
            readinessValues.reduce((sum, value) => sum + value, 0) / readinessValues.length,
          )
        : null;

    let totalDocuments = 0;
    let succeededDocuments = 0;
    let failedDocuments = 0;

    for (const query of summaryQueries) {
      if (!query.data) continue;
      totalDocuments +=
        query.data.totals.succeeded + query.data.totals.failed + query.data.totals.pending;
      succeededDocuments += query.data.totals.succeeded;
      failedDocuments += query.data.totals.failed;
    }

    return {
      averageReadiness,
      totalDocuments,
      succeededDocuments,
      failedDocuments,
    };
  }, [readinessQueries, summaryQueries]);

  const createMutation = useMutation({
    mutationFn: async (values: PreProjectInput) => {
      const baseSlug = slugify(values.name);
      let org = organizations[0] ?? null;

      if (!org) {
        org = await organizationsApi.create({
          name: values.name,
          slug: baseSlug,
        });
      }

      const existingSlugs = projects
        .filter((project) => project.organization.id === org!.id)
        .map((project) => project.slug);
      let workspaceSlug = baseSlug;
      let suffix = 2;
      while (existingSlugs.includes(workspaceSlug)) {
        workspaceSlug = `${baseSlug}${suffix}`;
        suffix += 1;
      }

      const workspace = await workspacesApi.create(org.id, {
        name: values.name,
        slug: workspaceSlug,
        description: values.description,
      });

      setOrganization(org);

      const profile = await profileApi.upsert(
        workspace.id,
        buildPreProjectProfile(values),
      );

      return { org, workspace, profile };
    },
    onSuccess: async ({ org, workspace }) => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces", org.id] });
      setOrganization(org);
      setOpen(false);
      toast.success(tr.org.created);
      router.push(`/o/${org.id}/w/${workspace.id}/plan`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, tr.org.createFailed));
    },
  });

  const showEmptyState =
    !orgsQuery.isLoading &&
    !workspacesLoading &&
    !orgsQuery.isError &&
    !workspacesError &&
    projects.length === 0;

  const showProjectGrid = !orgsQuery.isLoading && !workspacesLoading && projects.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-800/70">
            {tr.brandTitle}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{tr.org.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {tr.org.description}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <LlmHealthBadge
            health={healthQuery.data}
            isLoading={healthQuery.isLoading}
            isError={healthQuery.isError}
          />
          <CreateProjectDialog
            open={open}
            onOpenChange={setOpen}
            isPending={createMutation.isPending}
            onSubmit={(values) => createMutation.mutate(values)}
          />
        </div>
      </div>

      {orgsQuery.isLoading || workspacesLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        </div>
      ) : null}

      {orgsQuery.isError || workspacesError ? (
        <EmptyState
          title={tr.org.loadFailed}
          description={getErrorMessage(orgsQuery.error ?? workspacesError)}
          action={
            <Button
              variant="outline"
              onClick={() => {
                void orgsQuery.refetch();
                for (const query of workspaceQueries) {
                  void query.refetch();
                }
              }}
            >
              {tr.org.retry}
            </Button>
          }
        />
      ) : null}

      {showEmptyState ? (
        <EmptyState
          icon={<FolderKanban className="size-5" />}
          title={tr.org.emptyTitle}
          description={tr.org.emptyDescriptionExtended}
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              {tr.org.createTitle}
            </Button>
          }
        />
      ) : null}

      {showProjectGrid ? (
        <>
          <ProjectsDashboardHeader
            projectCount={projects.length}
            averageReadiness={dashboardStats.averageReadiness}
            totalDocuments={dashboardStats.totalDocuments}
            succeededDocuments={dashboardStats.succeededDocuments}
            failedDocuments={dashboardStats.failedDocuments}
            metricsLoading={cardDetailsLoading}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                profile={profileQueries[index]?.data}
                readiness={readinessQueries[index]?.data}
                summary={summaryQueries[index]?.data}
                isLoading={
                  profileQueries[index]?.isLoading &&
                  readinessQueries[index]?.isLoading &&
                  summaryQueries[index]?.isLoading
                }
                onNavigate={() => setOrganization(project.organization)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
