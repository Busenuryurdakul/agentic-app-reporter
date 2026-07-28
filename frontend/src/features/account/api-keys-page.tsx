"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { EmptyState } from "@/components/layout/empty-state";
import { TopBar } from "@/components/layout/top-bar";
import { getErrorMessage } from "@/lib/api/errors";
import { apiKeysApi } from "@/lib/api/api-keys";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("tr-TR");
}

export function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const keysQuery = useQuery({
    queryKey: ["user-api-keys"],
    queryFn: async () => {
      const result = await apiKeysApi.list();
      return result.keys ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string }) => apiKeysApi.create(payload),
    onSuccess: (data) => {
      setRevealedKey(data.key);
      setCreateOpen(false);
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["user-api-keys"] });
      toast.success(tr.apiKeys.created);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, tr.apiKeys.createFailed));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => apiKeysApi.revoke(keyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-api-keys"] });
      toast.success(tr.apiKeys.revoked);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, tr.apiKeys.revokeFailed));
    },
  });

  const keys = keysQuery.data ?? [];

  async function copyKey(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(tr.apiKeys.copied);
    } catch {
      toast.error(tr.apiKeys.copyFailed);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.08),_transparent_32%),linear-gradient(180deg,#f7f8f8_0%,#eef1f1_100%)]">
      <TopBar title={tr.apiKeys.title} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8">
        <div className="mb-4">
          <AppBreadcrumbs
            items={[
              { label: tr.common.organizations, href: "/organizations" },
              { label: tr.apiKeys.title },
            ]}
          />
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">{tr.apiKeys.title}</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {tr.apiKeys.description}
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="shrink-0">
              <Plus className="size-4" />
              {tr.apiKeys.create}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tr.apiKeys.listTitle}</CardTitle>
              <CardDescription>{tr.apiKeys.listDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {keysQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : keysQuery.isError ? (
                <EmptyState
                  title={tr.apiKeys.loadFailed}
                  description={getErrorMessage(keysQuery.error, tr.common.loadFailed)}
                  action={
                    <Button variant="outline" onClick={() => keysQuery.refetch()}>
                      {tr.common.retry}
                    </Button>
                  }
                />
              ) : keys.length === 0 ? (
                <EmptyState
                  icon={<KeyRound className="size-5" />}
                  title={tr.apiKeys.emptyTitle}
                  description={tr.apiKeys.emptyDescription}
                  action={
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus className="size-4" />
                      {tr.apiKeys.create}
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-border">
                  {keys.map((key) => (
                    <li
                      key={key.id}
                      className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">{key.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tr.apiKeys.createdAt}: {formatDate(key.created_at)}
                          {" · "}
                          {tr.apiKeys.lastUsed}: {formatDate(key.last_used_at)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {key.is_active ? tr.apiKeys.active : tr.apiKeys.inactive}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!key.is_active || revokeMutation.isPending}
                        onClick={() => revokeMutation.mutate(key.id)}
                      >
                        <Trash2 className="size-4" />
                        {tr.apiKeys.revoke}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tr.apiKeys.mcpTitle}</CardTitle>
              <CardDescription>{tr.apiKeys.mcpDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{tr.apiKeys.mcpUsage}</p>
              <code className="block rounded-md bg-muted px-3 py-2 text-xs text-foreground">
                Authorization: Bearer adcs_…
              </code>
              <p className="pt-2">{tr.apiKeys.mcpTools}</p>
              <p>{tr.apiKeys.mcpCursorHint}</p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr.apiKeys.createTitle}</DialogTitle>
            <DialogDescription>{tr.apiKeys.createDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="api-key-name">{tr.apiKeys.nameLabel}</Label>
            <Input
              id="api-key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={tr.apiKeys.namePlaceholder}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {tr.common.cancel}
            </Button>
            <Button
              disabled={!name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({ name: name.trim() })}
            >
              {createMutation.isPending ? tr.apiKeys.creating : tr.apiKeys.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revealedKey)} onOpenChange={(open) => !open && setRevealedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr.apiKeys.revealTitle}</DialogTitle>
            <DialogDescription>{tr.apiKeys.revealDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{tr.apiKeys.keyLabel}</Label>
            <div className="flex gap-2">
              <Input readOnly value={revealedKey ?? ""} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => revealedKey && copyKey(revealedKey)}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealedKey(null)}>{tr.apiKeys.close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
