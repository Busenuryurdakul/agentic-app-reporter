"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState } from "@/components/layout/empty-state";
import { getErrorMessage } from "@/lib/api/errors";
import { organizationsApi } from "@/lib/api/organizations";
import { profileApi } from "@/lib/api/profile";
import { workspacesApi } from "@/lib/api/workspaces";
import type { Organization, Workspace } from "@/lib/api/types";
import {
  buildPreProjectProfile,
  type PreProjectInput,
} from "@/features/projects/build-pre-project-profile";
import { CreateProjectDialog } from "@/features/projects/create-project-dialog";
import { tr } from "@/lib/i18n/tr";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type ProjectCard = Workspace & {
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

  const organizations = orgsQuery.data?.data ?? [];

  const workspaceQueries = useQueries({
    queries: organizations.map((org) => ({
      queryKey: ["workspaces", org.id],
      queryFn: () => workspacesApi.list(org.id),
      enabled: orgsQuery.isSuccess,
    })),
  });

  const projects = useMemo(() => {
    const items: ProjectCard[] = [];
    organizations.forEach((org, index) => {
      const workspaces = workspaceQueries[index]?.data ?? [];
      for (const workspace of workspaces) {
        items.push({ ...workspace, organization: org });
      }
    });
    return items;
  }, [organizations, workspaceQueries]);

  const workspacesLoading =
    orgsQuery.isSuccess &&
    organizations.length > 0 &&
    workspaceQueries.some((query) => query.isLoading);

  const workspacesError = workspaceQueries.find((query) => query.isError)?.error;

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

      // Ensure org context is available for the profile request headers.
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 md:px-8">
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
        <CreateProjectDialog
          open={open}
          onOpenChange={setOpen}
          isPending={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate(values)}
        />
      </div>

      {orgsQuery.isLoading || workspacesLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
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

      {!orgsQuery.isLoading &&
      !workspacesLoading &&
      !orgsQuery.isError &&
      !workspacesError &&
      projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="size-5" />}
          title={tr.org.emptyTitle}
          description={tr.org.emptyDescription}
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              {tr.org.createTitle}
            </Button>
          }
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer transition-colors hover:border-teal-700/30 hover:bg-teal-50/40"
            onClick={() => {
              setOrganization(project.organization);
              router.push(`/o/${project.organization.id}/w/${project.id}/plan`);
            }}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <CardDescription>/{project.slug}</CardDescription>
              </div>
              <Badge variant="secondary">{project.status}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {project.description || tr.workspace.noDescription}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {tr.org.createdAt}{" "}
                {new Date(project.created_at).toLocaleDateString("tr-TR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
