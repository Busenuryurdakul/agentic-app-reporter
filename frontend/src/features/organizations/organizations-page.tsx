"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState } from "@/components/layout/empty-state";
import { getErrorMessage } from "@/lib/api/errors";
import { organizationsApi } from "@/lib/api/organizations";
import { tr } from "@/lib/i18n/tr";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const createSchema = z.object({
  name: z.string().min(2, "Ad en az 2 karakter olmalı"),
  slug: z
    .string()
    .min(2, "Kısa ad en az 2 karakter olmalı")
    .regex(/^[a-zA-Z0-9]+$/, "Kısa ad yalnızca harf ve rakam içermelidir"),
});

type CreateValues = z.infer<typeof createSchema>;

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 48);
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

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", slug: "" },
  });

  const createMutation = useMutation({
    mutationFn: organizationsApi.create,
    onSuccess: async (org) => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setOrganization(org);
      setOpen(false);
      form.reset();
      toast.success(tr.org.created);
      router.push(`/o/${org.id}/workspaces`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, tr.org.createFailed));
    },
  });

  const organizations = orgsQuery.data?.data ?? [];

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

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              {tr.org.new}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tr.org.createTitle}</DialogTitle>
              <DialogDescription>{tr.org.createDescription}</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
            >
              <div className="space-y-2">
                <Label htmlFor="org-name">{tr.org.name}</Label>
                <Input
                  id="org-name"
                  placeholder="Acme Engineering"
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
                <Label htmlFor="org-slug">{tr.org.slug}</Label>
                <Input id="org-slug" placeholder="acmeengineering" {...form.register("slug")} />
                {form.formState.errors.slug ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.slug.message}
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {tr.org.cancel}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? tr.org.creating : tr.org.create}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {orgsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : null}

      {orgsQuery.isError ? (
        <EmptyState
          title={tr.org.loadFailed}
          description={getErrorMessage(orgsQuery.error)}
          action={
            <Button variant="outline" onClick={() => orgsQuery.refetch()}>
              {tr.org.retry}
            </Button>
          }
        />
      ) : null}

      {!orgsQuery.isLoading && !orgsQuery.isError && organizations.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-5" />}
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
        {organizations.map((org) => (
          <Card
            key={org.id}
            className="cursor-pointer transition-colors hover:border-teal-700/30 hover:bg-teal-50/40"
            onClick={() => {
              setOrganization(org);
              router.push(`/o/${org.id}/workspaces`);
            }}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">{org.name}</CardTitle>
                <CardDescription>/{org.slug}</CardDescription>
              </div>
              <Badge variant="secondary">{org.status}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {tr.org.createdAt} {new Date(org.created_at).toLocaleDateString("tr-TR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
