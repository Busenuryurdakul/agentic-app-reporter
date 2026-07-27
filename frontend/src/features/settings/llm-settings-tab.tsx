"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlugZap, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Switch } from "@/components/ui/switch";
import { LlmHealthBadge } from "@/features/projects/llm-health-badge";
import { getErrorMessage } from "@/lib/api/errors";
import {
  llmSettingsApi,
  type OrgLLMSettings,
  type TestOrgLLMConnectionResponse,
} from "@/lib/api/llm-settings";
import { tr } from "@/lib/i18n/tr";

const schema = z.object({
  provider: z.enum(["mock", "gemma", "ollama"]),
  base_url: z.string().optional(),
  model: z.string().optional(),
  provider_api_key: z.string().optional(),
  clear_provider_api_key: z.boolean().optional(),
  timeout_seconds: z.number().min(1).max(600),
  max_retries: z.number().min(0).max(10),
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type LlmSettingsTabProps = {
  orgId: string;
  canWrite: boolean;
};

export function LlmSettingsTab({ orgId, canWrite }: LlmSettingsTabProps) {
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<TestOrgLLMConnectionResponse | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["org-llm-settings", orgId],
    queryFn: () => llmSettingsApi.get(orgId),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      provider: "mock",
      base_url: "",
      model: "",
      provider_api_key: "",
      clear_provider_api_key: false,
      timeout_seconds: 60,
      max_retries: 2,
      enabled: true,
    },
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    resetFormFromSettings(settingsQuery.data, form.reset);
  }, [settingsQuery.data, form]);

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      llmSettingsApi.update(orgId, {
        provider: values.provider,
        base_url: values.base_url?.trim() || undefined,
        model: values.model?.trim() || undefined,
        provider_api_key: values.provider_api_key?.trim() || undefined,
        clear_provider_api_key: values.clear_provider_api_key,
        timeout_seconds: values.timeout_seconds,
        max_retries: values.max_retries,
        enabled: values.enabled,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["org-llm-settings", orgId], data);
      resetFormFromSettings(data, form.reset);
      form.setValue("provider_api_key", "");
      form.setValue("clear_provider_api_key", false);
      setTestResult(null);
      toast.success(tr.llmSettings.saved);
    },
    onError: (error) => toast.error(getErrorMessage(error, tr.llmSettings.saveFailed)),
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      llmSettingsApi.update(orgId, {
        provider: "mock",
        reset_to_env_defaults: true,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["org-llm-settings", orgId], data);
      resetFormFromSettings(data, form.reset);
      setTestResult(null);
      toast.success(tr.llmSettings.saved);
    },
    onError: (error) => toast.error(getErrorMessage(error, tr.llmSettings.saveFailed)),
  });

  const testMutation = useMutation({
    mutationFn: () => {
      const values = form.getValues();
      return llmSettingsApi.test(orgId, {
        provider: values.provider,
        base_url: values.base_url?.trim() || undefined,
        model: values.model?.trim() || undefined,
        provider_api_key: values.provider_api_key?.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      setTestResult(data);
      if (data.healthy) {
        toast.success(tr.llmSettings.testOk(data.provider));
      } else {
        toast.error(tr.llmSettings.testFail);
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, tr.llmSettings.testFail)),
  });

  if (settingsQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (settingsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{tr.llmSettings.loadFailed}</AlertDescription>
      </Alert>
    );
  }

  const settings = settingsQuery.data!;
  const provider = form.watch("provider");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{tr.llmSettings.title}</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              {tr.llmSettings.description}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={settings.configured ? "default" : "outline"}>
              {settings.configured ? tr.llmSettings.configured : tr.llmSettings.usingEnv}
            </Badge>
            <Badge variant="secondary">
              {settings.source === "organization"
                ? tr.llmSettings.sourceOrg
                : tr.llmSettings.sourceEnv}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!canWrite ? (
          <Alert className="mb-6">
            <AlertDescription>{tr.llmSettings.readOnlyHint}</AlertDescription>
          </Alert>
        ) : null}

        <form
          className="space-y-6"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider">{tr.llmSettings.provider}</Label>
              <Controller
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <Select
                    disabled={!canWrite}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mock">{tr.llmSettings.providerMock}</SelectItem>
                      <SelectItem value="gemma">{tr.llmSettings.providerGemma}</SelectItem>
                      <SelectItem value="ollama">{tr.llmSettings.providerOllama}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">{tr.llmSettings.model}</Label>
              <Input
                id="model"
                disabled={!canWrite}
                {...form.register("model")}
                placeholder={settings.model || "mock-model"}
              />
            </div>
          </div>

          {provider === "gemma" || provider === "ollama" ? (
            <div className="space-y-2">
              <Label htmlFor="base_url">{tr.llmSettings.baseUrl}</Label>
              <Input
                id="base_url"
                disabled={!canWrite}
                {...form.register("base_url")}
                placeholder={
                  provider === "ollama"
                    ? "http://127.0.0.1:11434/v1"
                    : "https://example.com/v1"
                }
              />
              <p className="text-xs text-muted-foreground">{tr.llmSettings.baseUrlHint}</p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timeout_seconds">{tr.llmSettings.timeoutSeconds}</Label>
              <Input
                id="timeout_seconds"
                type="number"
                min={1}
                max={600}
                disabled={!canWrite}
                {...form.register("timeout_seconds", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_retries">{tr.llmSettings.maxRetries}</Label>
              <Input
                id="max_retries"
                type="number"
                min={0}
                max={10}
                disabled={!canWrite}
                {...form.register("max_retries", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="enabled">{tr.llmSettings.enabled}</Label>
            </div>
            <Controller
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <Switch
                  id="enabled"
                  disabled={!canWrite}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider_api_key">{tr.llmSettings.providerApiKey}</Label>
            <Input
              id="provider_api_key"
              type="password"
              autoComplete="off"
              disabled={!canWrite}
              placeholder={tr.llmSettings.providerApiKeyPlaceholder}
              {...form.register("provider_api_key")}
            />
            <p className="text-xs text-muted-foreground">{tr.llmSettings.providerApiKeyHint}</p>
            {settings.has_provider_api_key ? (
              <p className="text-xs font-medium text-teal-700">{tr.llmSettings.hasProviderApiKey}</p>
            ) : null}
            {canWrite ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border"
                  {...form.register("clear_provider_api_key")}
                />
                {tr.llmSettings.clearProviderApiKey}
              </label>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <Button type="submit" disabled={!canWrite || saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {saveMutation.isPending ? tr.llmSettings.saving : tr.llmSettings.save}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={testMutation.isPending}
              onClick={() => testMutation.mutate()}
            >
              {testMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <PlugZap className="mr-2 size-4" />
              )}
              {testMutation.isPending ? tr.llmSettings.testing : tr.llmSettings.testConnection}
            </Button>

            {canWrite && settings.configured ? (
              <Button
                type="button"
                variant="ghost"
                disabled={resetMutation.isPending}
                onClick={() => {
                  if (window.confirm(tr.llmSettings.resetConfirm)) {
                    resetMutation.mutate();
                  }
                }}
              >
                {tr.llmSettings.resetToEnv}
              </Button>
            ) : null}

            {testResult ? (
              <LlmHealthBadge
                health={{
                  provider: testResult.provider,
                  healthy: testResult.healthy,
                  message: testResult.message,
                  enabled: testResult.enabled,
                }}
              />
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function resetFormFromSettings(
  settings: OrgLLMSettings,
  reset: (values: FormValues) => void,
) {
  reset({
    provider:
      settings.provider === "gemma"
        ? "gemma"
        : settings.provider === "ollama"
          ? "ollama"
          : "mock",
    base_url: settings.base_url ?? "",
    model: settings.model ?? "",
    provider_api_key: "",
    clear_provider_api_key: false,
    timeout_seconds: settings.timeout_seconds || 60,
    max_retries: settings.max_retries ?? 2,
    enabled: settings.enabled,
  });
}
