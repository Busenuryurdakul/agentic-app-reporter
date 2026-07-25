"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/layout/empty-state";
import { ProjectCard } from "@/features/projects/project-card";
import { getErrorMessage } from "@/lib/api/errors";
import { observeApi } from "@/lib/api/observe";
import { profileApi } from "@/lib/api/profile";
import { workspacesApi } from "@/lib/api/workspaces";
import type { Organization } from "@/lib/api/types";
import { tr } from "@/lib/i18n/tr";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  name: z.string().min(2, "Ad en az 2 karakter olmalı"),
  slug: z
    .string()
    .min(2, "Kısa ad en az 2 karakter olmalı")
    .regex(/^[a-zA-Z0-9]+$/, "Kısa ad yalnızca harf ve rakam içermelidir"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 48);
}

export function WorkspacesPage({ orgId }: { orgId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const workspacesQuery = useQuery({
    queryKey: ["workspaces", orgId],
    queryFn: () => workspacesApi.list(orgId),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", description: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => workspacesApi.create(orgId, values),
    onSuccess: async (workspace) => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces", orgId] });
      toast.success(tr.workspace.created);
      router.push(`/o/${orgId}/w/${workspace.id}/plan`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, tr.workspace.createFailed));
    },
  });

  const workspaces = workspacesQuery.data ?? [];

  const organizationStub: Organization = {
    id: orgId,
    name: "",
    slug: "",
    status: "active",
    created_at: "",
  };

  const profileQueries = useQueries({
    queries: workspaces.map((workspace) => ({
      queryKey: ["profile", orgId, workspace.id],
      queryFn: () => profileApi.get(workspace.id, orgId),
      enabled: workspaces.length > 0,
      staleTime: 60_000,
    })),
  });

  const readinessQueries = useQueries({
    queries: workspaces.map((workspace) => ({
      queryKey: ["readiness", orgId, workspace.id],
      queryFn: () => observeApi.readiness(workspace.id, orgId),
      enabled: workspaces.length > 0,
      staleTime: 60_000,
    })),
  });

  const summaryQueries = useQueries({
    queries: workspaces.map((workspace) => ({
      queryKey: ["observe-summary", orgId, workspace.id],
      queryFn: () => observeApi.summary(workspace.id, 1, orgId),
      enabled: workspaces.length > 0,
      staleTime: 60_000,
    })),
  });

  return (
    <DashboardShell
      orgId={orgId}
      title={tr.workspace.title}
      breadcrumbs={[
        { label: tr.common.organizations, href: "/organizations" },
        { label: tr.common.workspaces },
      ]}
    >
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{tr.workspace.title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {tr.workspace.description}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4">
          {workspacesQuery.isLoading ? (
            <>
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-72 w-full" />
            </>
          ) : null}

          {workspacesQuery.isError ? (
            <EmptyState
              title={tr.workspace.loadFailed}
              description={getErrorMessage(
                workspacesQuery.error,
                tr.workspace.loadFailedHint,
              )}
              action={
                <Button variant="outline" onClick={() => workspacesQuery.refetch()}>
                  {tr.common.retry}
                </Button>
              }
            />
          ) : null}

          {!workspacesQuery.isLoading &&
          !workspacesQuery.isError &&
          workspaces.length === 0 ? (
            <EmptyState
              icon={<FolderKanban className="size-5" />}
              title={tr.workspace.emptyTitle}
              description={tr.workspace.emptyDescription}
            />
          ) : null}

          <div className="grid gap-4">
            {workspaces.map((workspace, index) => (
              <ProjectCard
                key={workspace.id}
                project={{ ...workspace, organization: organizationStub }}
                profile={profileQueries[index]?.data}
                readiness={readinessQueries[index]?.data}
                summary={summaryQueries[index]?.data}
                isLoading={
                  profileQueries[index]?.isLoading &&
                  readinessQueries[index]?.isLoading &&
                  summaryQueries[index]?.isLoading
                }
              />
            ))}
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="size-4" />
              {tr.workspace.newTitle}
            </CardTitle>
            <CardDescription>{tr.workspace.newDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
            >
              <div className="space-y-2">
                <Label htmlFor="workspace-name">{tr.workspace.name}</Label>
                <Input
                  id="workspace-name"
                  placeholder="Payments Platform"
                  {...form.register("name", {
                    onChange: (event) => {
                      const name = event.target.value;
                      if (!form.formState.dirtyFields.slug) {
                        form.setValue("slug", slugify(name), { shouldValidate: true });
                      }
                    },
                  })}
                />
                {form.formState.errors.name ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-slug">{tr.workspace.slug}</Label>
                <Input
                  id="workspace-slug"
                  placeholder="paymentsplatform"
                  {...form.register("slug")}
                />
                {form.formState.errors.slug ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.slug.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-description">{tr.workspace.descriptionLabel}</Label>
                <Textarea
                  id="workspace-description"
                  placeholder={tr.workspace.descriptionPlaceholder}
                  rows={4}
                  {...form.register("description")}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? tr.workspace.creating : tr.workspace.create}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
