"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api/errors";
import {
  profileApi,
  type ProfileInfo,
  type ProfileSection,
  type UpsertProfileRequest,
} from "@/lib/api/profile";
import { workspacesApi } from "@/lib/api/workspaces";
import { tr } from "@/lib/i18n/tr";

const projectStatusValues = [
  "planned",
  "in_progress",
  "active",
  "maintenance",
  "archived",
] as const;

const documentLanguageValues = ["tr", "en"] as const;

const schema = z.object({
  project_name: z.string().min(2, "Proje adı en az 2 karakter olmalı"),
  project_description: z.string().optional(),
  product_type: z.string().optional(),
  target_users: z.string().optional(),
  main_problem: z.string().optional(),
  main_use_cases: z.string().optional(),
  project_status: z.enum(projectStatusValues),
  preferred_document_language: z.enum(documentLanguageValues),

  frontend_framework: z.string().optional(),
  frontend_language: z.string().optional(),
  frontend_ui_library: z.string().optional(),

  backend_framework: z.string().optional(),
  backend_language: z.string().optional(),
  backend_database: z.string().optional(),

  data_primary_database: z.string().optional(),
  data_analytics_tool: z.string().optional(),
  data_storage: z.string().optional(),

  infra_hosting_provider: z.string().optional(),
  infra_ci_cd: z.string().optional(),
  infra_containerization: z.string().optional(),

  ai_model_provider: z.string().optional(),
  ai_primary_model: z.string().optional(),
  ai_vector_store: z.string().optional(),

  standards_linting_tool: z.string().optional(),
  standards_testing_framework: z.string().optional(),
  standards_code_review_process: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function sectionString(section: ProfileSection | null | undefined, key: string): string {
  const value = section?.[key];
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

function toFormValues(profile: ProfileInfo): FormValues {
  return {
    project_name: profile.project_name ?? "",
    project_description: profile.project_description ?? "",
    product_type: profile.product_type ?? "",
    target_users: profile.target_users ?? "",
    main_problem: profile.main_problem ?? "",
    main_use_cases: profile.main_use_cases ?? "",
    project_status: (projectStatusValues as readonly string[]).includes(profile.project_status)
      ? (profile.project_status as FormValues["project_status"])
      : "planned",
    preferred_document_language: (
      documentLanguageValues as readonly string[]
    ).includes(profile.preferred_document_language)
      ? (profile.preferred_document_language as FormValues["preferred_document_language"])
      : "tr",

    frontend_framework: sectionString(profile.frontend, "framework"),
    frontend_language: sectionString(profile.frontend, "language"),
    frontend_ui_library: sectionString(profile.frontend, "ui_library"),

    backend_framework: sectionString(profile.backend, "framework"),
    backend_language: sectionString(profile.backend, "language"),
    backend_database: sectionString(profile.backend, "database"),

    data_primary_database: sectionString(profile.data, "primary_database"),
    data_analytics_tool: sectionString(profile.data, "analytics_tool"),
    data_storage: sectionString(profile.data, "storage"),

    infra_hosting_provider: sectionString(profile.infrastructure, "hosting_provider"),
    infra_ci_cd: sectionString(profile.infrastructure, "ci_cd"),
    infra_containerization: sectionString(profile.infrastructure, "containerization"),

    ai_model_provider: sectionString(profile.ai, "model_provider"),
    ai_primary_model: sectionString(profile.ai, "primary_model"),
    ai_vector_store: sectionString(profile.ai, "vector_store"),

    standards_linting_tool: sectionString(profile.development_standards, "linting_tool"),
    standards_testing_framework: sectionString(
      profile.development_standards,
      "testing_framework",
    ),
    standards_code_review_process: sectionString(
      profile.development_standards,
      "code_review_process",
    ),
  };
}

function isNonEmptyValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

/**
 * Merges freshly entered field values into the existing raw section object so
 * that keys outside this simplified form (e.g. seeded data) are preserved.
 * Returns undefined when the resulting section would be empty, so the field
 * is omitted from the request entirely (leaving any stored value untouched).
 */
function buildSectionPayload(
  current: ProfileSection | null | undefined,
  updates: Record<string, string>,
): ProfileSection | undefined {
  const merged: ProfileSection = { ...(current ?? {}) };
  for (const [key, value] of Object.entries(updates)) {
    const trimmed = value.trim();
    if (trimmed) {
      merged[key] = trimmed;
    }
  }
  const hasContent = Object.values(merged).some(isNonEmptyValue);
  return hasContent ? merged : undefined;
}

const sectionOrder = [
  "general",
  "frontend",
  "backend",
  "data",
  "infrastructure",
  "ai",
  "development_standards",
] as const;

function sectionLabel(key: string): string {
  switch (key) {
    case "general":
      return tr.plan.sectionGeneral;
    case "frontend":
      return tr.plan.sectionFrontend;
    case "backend":
      return tr.plan.sectionBackend;
    case "data":
      return tr.plan.sectionData;
    case "infrastructure":
      return tr.plan.sectionInfrastructure;
    case "ai":
      return tr.plan.sectionAI;
    case "development_standards":
      return tr.plan.sectionStandards;
    default:
      return key;
  }
}

export function ProjectProfilePage({
  orgId,
  workspaceId,
}: {
  orgId: string;
  workspaceId: string;
}) {
  const queryClient = useQueryClient();

  const workspaceQuery = useQuery({
    queryKey: ["workspace", orgId, workspaceId],
    queryFn: () => workspacesApi.get(orgId, workspaceId),
  });

  const profileQuery = useQuery({
    queryKey: ["profile", workspaceId],
    queryFn: () => profileApi.get(workspaceId),
  });

  const completenessQuery = useQuery({
    queryKey: ["profile-completeness", workspaceId],
    queryFn: () => profileApi.completeness(workspaceId),
    enabled: !profileQuery.isLoading,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: profileQuery.data ? toFormValues(profileQuery.data) : undefined,
    defaultValues: toFormValues({
      id: "",
      organization_id: "",
      workspace_id: "",
      project_name: "",
      project_description: "",
      product_type: "",
      target_users: "",
      main_problem: "",
      main_use_cases: "",
      project_status: "planned",
      preferred_document_language: "tr",
      frontend: {},
      backend: {},
      data: {},
      infrastructure: {},
      ai: {},
      development_standards: {},
      created_at: "",
      updated_at: "",
    }),
  });

  const upsertMutation = useMutation({
    mutationFn: (body: UpsertProfileRequest) => profileApi.upsert(workspaceId, body),
    onSuccess: async (updated) => {
      queryClient.setQueryData(["profile", workspaceId], updated);
      await queryClient.invalidateQueries({ queryKey: ["profile-completeness", workspaceId] });
      toast.success(tr.plan.saved);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, tr.plan.saveFailed));
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const current = profileQuery.data;
    const body: UpsertProfileRequest = {
      project_name: values.project_name.trim(),
      project_description: values.project_description?.trim() || undefined,
      product_type: values.product_type?.trim() || undefined,
      target_users: values.target_users?.trim() || undefined,
      main_problem: values.main_problem?.trim() || undefined,
      main_use_cases: values.main_use_cases?.trim() || undefined,
      project_status: values.project_status,
      preferred_document_language: values.preferred_document_language,
      frontend: buildSectionPayload(current?.frontend, {
        framework: values.frontend_framework ?? "",
        language: values.frontend_language ?? "",
        ui_library: values.frontend_ui_library ?? "",
      }),
      backend: buildSectionPayload(current?.backend, {
        framework: values.backend_framework ?? "",
        language: values.backend_language ?? "",
        database: values.backend_database ?? "",
      }),
      data: buildSectionPayload(current?.data, {
        primary_database: values.data_primary_database ?? "",
        analytics_tool: values.data_analytics_tool ?? "",
        storage: values.data_storage ?? "",
      }),
      infrastructure: buildSectionPayload(current?.infrastructure, {
        hosting_provider: values.infra_hosting_provider ?? "",
        ci_cd: values.infra_ci_cd ?? "",
        containerization: values.infra_containerization ?? "",
      }),
      ai: buildSectionPayload(current?.ai, {
        model_provider: values.ai_model_provider ?? "",
        primary_model: values.ai_primary_model ?? "",
        vector_store: values.ai_vector_store ?? "",
      }),
      development_standards: buildSectionPayload(current?.development_standards, {
        linting_tool: values.standards_linting_tool ?? "",
        testing_framework: values.standards_testing_framework ?? "",
        code_review_process: values.standards_code_review_process ?? "",
      }),
    };
    upsertMutation.mutate(body);
  });

  const workspaceName = workspaceQuery.data?.name;
  const overall = completenessQuery.data?.overall ?? 0;

  return (
    <DashboardShell
      orgId={orgId}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      title={tr.plan.title}
      breadcrumbs={[
        { label: tr.common.organizations, href: "/organizations" },
        { label: tr.common.workspaces, href: `/o/${orgId}/workspaces` },
        { label: workspaceName ?? tr.plan.title, href: `/o/${orgId}/w/${workspaceId}/plan` },
        { label: tr.plan.title },
      ]}
    >
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{tr.plan.title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{tr.plan.description}</p>
      </div>

      {profileQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : null}

      {profileQuery.isError ? (
        <EmptyState
          title={tr.plan.loadFailed}
          description={getErrorMessage(profileQuery.error, tr.plan.loadFailed)}
          action={
            <Button variant="outline" onClick={() => profileQuery.refetch()}>
              {tr.common.retry}
            </Button>
          }
        />
      ) : null}

      {!profileQuery.isLoading && !profileQuery.isError ? (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr] xl:items-start">
          <div className="space-y-6 xl:sticky xl:top-20">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{tr.plan.completenessTitle}</CardTitle>
                <CardDescription>{tr.plan.completenessHint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{tr.plan.overall}</span>
                  <Badge variant={overall >= 80 ? "default" : "secondary"}>{overall}%</Badge>
                </div>
                <Progress value={overall} />

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tr.plan.sectionsTitle}
                  </p>
                  {sectionOrder.map((key) => {
                    const value = completenessQuery.data?.sections[key] ?? 0;
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span>{sectionLabel(key)}</span>
                          <span className="text-muted-foreground">{value}%</span>
                        </div>
                        <Progress value={value} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <form className="space-y-6" onSubmit={onSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{tr.plan.sectionGeneral}</CardTitle>
                <CardDescription>{tr.plan.sectionGeneralHint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project_name">{tr.plan.fields.projectName}</Label>
                  <Input
                    id="project_name"
                    placeholder={tr.plan.fields.projectNamePlaceholder}
                    {...form.register("project_name")}
                  />
                  {form.formState.errors.project_name ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.project_name.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_description">{tr.plan.fields.projectDescription}</Label>
                  <Textarea
                    id="project_description"
                    rows={3}
                    placeholder={tr.plan.fields.projectDescriptionPlaceholder}
                    {...form.register("project_description")}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="product_type">{tr.plan.fields.productType}</Label>
                    <Input
                      id="product_type"
                      placeholder={tr.plan.fields.productTypePlaceholder}
                      {...form.register("product_type")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_users">{tr.plan.fields.targetUsers}</Label>
                    <Input
                      id="target_users"
                      placeholder={tr.plan.fields.targetUsersPlaceholder}
                      {...form.register("target_users")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="main_problem">{tr.plan.fields.mainProblem}</Label>
                  <Textarea
                    id="main_problem"
                    rows={2}
                    placeholder={tr.plan.fields.mainProblemPlaceholder}
                    {...form.register("main_problem")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="main_use_cases">{tr.plan.fields.mainUseCases}</Label>
                  <Textarea
                    id="main_use_cases"
                    rows={2}
                    placeholder={tr.plan.fields.mainUseCasesPlaceholder}
                    {...form.register("main_use_cases")}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{tr.plan.fields.projectStatus}</Label>
                    <Controller
                      control={form.control}
                      name="project_status"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {projectStatusValues.map((value) => (
                              <SelectItem key={value} value={value}>
                                {tr.plan.projectStatusOptions[value]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tr.plan.fields.preferredDocumentLanguage}</Label>
                    <Controller
                      control={form.control}
                      name="preferred_document_language"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {documentLanguageValues.map((value) => (
                              <SelectItem key={value} value={value}>
                                {tr.plan.documentLanguageOptions[value]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{tr.plan.sectionFrontend}</CardTitle>
                <CardDescription>{tr.plan.sectionFrontendHint}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="frontend_framework">{tr.plan.fields.frontendFramework}</Label>
                  <Input
                    id="frontend_framework"
                    placeholder={tr.plan.fields.frontendFrameworkPlaceholder}
                    {...form.register("frontend_framework")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frontend_language">{tr.plan.fields.frontendLanguage}</Label>
                  <Input
                    id="frontend_language"
                    placeholder={tr.plan.fields.frontendLanguagePlaceholder}
                    {...form.register("frontend_language")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frontend_ui_library">{tr.plan.fields.frontendUiLibrary}</Label>
                  <Input
                    id="frontend_ui_library"
                    placeholder={tr.plan.fields.frontendUiLibraryPlaceholder}
                    {...form.register("frontend_ui_library")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{tr.plan.sectionBackend}</CardTitle>
                <CardDescription>{tr.plan.sectionBackendHint}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="backend_framework">{tr.plan.fields.backendFramework}</Label>
                  <Input
                    id="backend_framework"
                    placeholder={tr.plan.fields.backendFrameworkPlaceholder}
                    {...form.register("backend_framework")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backend_language">{tr.plan.fields.backendLanguage}</Label>
                  <Input
                    id="backend_language"
                    placeholder={tr.plan.fields.backendLanguagePlaceholder}
                    {...form.register("backend_language")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backend_database">{tr.plan.fields.backendDatabase}</Label>
                  <Input
                    id="backend_database"
                    placeholder={tr.plan.fields.backendDatabasePlaceholder}
                    {...form.register("backend_database")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{tr.plan.sectionData}</CardTitle>
                <CardDescription>{tr.plan.sectionDataHint}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="data_primary_database">
                    {tr.plan.fields.dataPrimaryDatabase}
                  </Label>
                  <Input
                    id="data_primary_database"
                    placeholder={tr.plan.fields.dataPrimaryDatabasePlaceholder}
                    {...form.register("data_primary_database")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_analytics_tool">{tr.plan.fields.dataAnalyticsTool}</Label>
                  <Input
                    id="data_analytics_tool"
                    placeholder={tr.plan.fields.dataAnalyticsToolPlaceholder}
                    {...form.register("data_analytics_tool")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_storage">{tr.plan.fields.dataStorage}</Label>
                  <Input
                    id="data_storage"
                    placeholder={tr.plan.fields.dataStoragePlaceholder}
                    {...form.register("data_storage")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{tr.plan.sectionInfrastructure}</CardTitle>
                <CardDescription>{tr.plan.sectionInfrastructureHint}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="infra_hosting_provider">
                    {tr.plan.fields.infraHostingProvider}
                  </Label>
                  <Input
                    id="infra_hosting_provider"
                    placeholder={tr.plan.fields.infraHostingProviderPlaceholder}
                    {...form.register("infra_hosting_provider")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="infra_ci_cd">{tr.plan.fields.infraCiCd}</Label>
                  <Input
                    id="infra_ci_cd"
                    placeholder={tr.plan.fields.infraCiCdPlaceholder}
                    {...form.register("infra_ci_cd")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="infra_containerization">
                    {tr.plan.fields.infraContainerization}
                  </Label>
                  <Input
                    id="infra_containerization"
                    placeholder={tr.plan.fields.infraContainerizationPlaceholder}
                    {...form.register("infra_containerization")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{tr.plan.sectionAI}</CardTitle>
                <CardDescription>{tr.plan.sectionAIHint}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ai_model_provider">{tr.plan.fields.aiModelProvider}</Label>
                  <Input
                    id="ai_model_provider"
                    placeholder={tr.plan.fields.aiModelProviderPlaceholder}
                    {...form.register("ai_model_provider")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai_primary_model">{tr.plan.fields.aiPrimaryModel}</Label>
                  <Input
                    id="ai_primary_model"
                    placeholder={tr.plan.fields.aiPrimaryModelPlaceholder}
                    {...form.register("ai_primary_model")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai_vector_store">{tr.plan.fields.aiVectorStore}</Label>
                  <Input
                    id="ai_vector_store"
                    placeholder={tr.plan.fields.aiVectorStorePlaceholder}
                    {...form.register("ai_vector_store")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{tr.plan.sectionStandards}</CardTitle>
                <CardDescription>{tr.plan.sectionStandardsHint}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="standards_linting_tool">
                    {tr.plan.fields.standardsLintingTool}
                  </Label>
                  <Input
                    id="standards_linting_tool"
                    placeholder={tr.plan.fields.standardsLintingToolPlaceholder}
                    {...form.register("standards_linting_tool")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="standards_testing_framework">
                    {tr.plan.fields.standardsTestingFramework}
                  </Label>
                  <Input
                    id="standards_testing_framework"
                    placeholder={tr.plan.fields.standardsTestingFrameworkPlaceholder}
                    {...form.register("standards_testing_framework")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="standards_code_review_process">
                    {tr.plan.fields.standardsCodeReviewProcess}
                  </Label>
                  <Input
                    id="standards_code_review_process"
                    placeholder={tr.plan.fields.standardsCodeReviewProcessPlaceholder}
                    {...form.register("standards_code_review_process")}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={upsertMutation.isPending}>
                <Save className="size-4" />
                {upsertMutation.isPending ? tr.common.saving : tr.common.save}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </DashboardShell>
  );
}
