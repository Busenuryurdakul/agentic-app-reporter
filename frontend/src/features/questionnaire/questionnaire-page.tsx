"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Save, SaveAll } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { EmptyState } from "@/components/layout/empty-state";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api/errors";
import {
  questionnaireApi,
  type BulkAnswerItem,
  type WorkspaceQuestionInfo,
} from "@/lib/api/questionnaire";
import { buildAnswersByKey, isQuestionVisible } from "@/lib/questionnaire/visibility";
import { workspacesApi } from "@/lib/api/workspaces";
import { tr } from "@/lib/i18n/tr";

function initialValueForQuestion(q: WorkspaceQuestionInfo): unknown {
  const answer = q.answer;
  switch (q.input_type) {
    case "boolean":
      return typeof answer === "boolean" ? answer : false;
    case "multi_select":
      return Array.isArray(answer) ? answer.map(String) : [];
    case "number":
      return answer != null ? String(answer) : "";
    case "single_select":
    case "short_text":
    case "long_text":
    case "url":
      return typeof answer === "string" ? answer : "";
    default:
      if (answer == null) return "";
      return typeof answer === "string" ? answer : JSON.stringify(answer, null, 2);
  }
}

function prepareValueForSave(q: WorkspaceQuestionInfo, raw: unknown): unknown {
  switch (q.input_type) {
    case "boolean":
      return Boolean(raw);
    case "multi_select":
      return Array.isArray(raw) ? raw : [];
    case "number": {
      const str = typeof raw === "string" ? raw.trim() : "";
      if (str === "") return null;
      const num = Number(str);
      return Number.isNaN(num) ? null : num;
    }
    case "single_select":
    case "short_text":
    case "long_text":
    case "url":
      return typeof raw === "string" ? raw : "";
    default: {
      const str = typeof raw === "string" ? raw : "";
      if (str.trim() === "") return "";
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    }
  }
}

function scrollToQuestion(questionId: string) {
  window.setTimeout(() => {
    const el = document.getElementById(`question-${questionId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 60);
}

export function QuestionnairePage({
  orgId,
  workspaceId,
}: {
  orgId: string;
  workspaceId: string;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("questions");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  const workspaceQuery = useQuery({
    queryKey: ["workspace", orgId, workspaceId],
    queryFn: () => workspacesApi.get(orgId, workspaceId),
  });

  const questionsQuery = useQuery({
    queryKey: ["workspace-questions", workspaceId],
    queryFn: () => questionnaireApi.listWorkspaceQuestions(workspaceId),
  });

  const missingQuery = useQuery({
    queryKey: ["missing-information", workspaceId],
    queryFn: () => questionnaireApi.missingInformation(workspaceId),
  });

  const questions = useMemo(() => questionsQuery.data?.questions ?? [], [questionsQuery.data]);

  if (!initialized && questions.length > 0) {
    const initial: Record<string, unknown> = {};
    for (const q of questions) {
      initial[q.id] = initialValueForQuestion(q);
    }
    setAnswers(initial);
    setInitialized(true);
  }

  const questionsById = useMemo(() => {
    const map = new Map<string, WorkspaceQuestionInfo>();
    for (const q of questions) map.set(q.id, q);
    return map;
  }, [questions]);

  const answersByKey = useMemo(
    () => buildAnswersByKey(questions, answers),
    [questions, answers],
  );

  const visibleQuestions = useMemo(
    () =>
      questions.filter((q) => isQuestionVisible(q.visibility_rules, answersByKey)),
    [questions, answersByKey],
  );

  const categories = useMemo(() => {
    const map = new Map<string, WorkspaceQuestionInfo[]>();
    for (const q of visibleQuestions) {
      const list = map.get(q.category) ?? [];
      list.push(q);
      map.set(q.category, list);
    }
    return Array.from(map.entries());
  }, [visibleQuestions]);

  const answeredCount = visibleQuestions.filter((q) => {
    const value = answers[q.id];
    if (q.input_type === "boolean") return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim() !== "";
    return value != null && value !== "";
  }).length;
  const totalCount = visibleQuestions.length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  async function invalidateAfterSave() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["workspace-questions", workspaceId] }),
      queryClient.invalidateQueries({ queryKey: ["missing-information", workspaceId] }),
      queryClient.invalidateQueries({ queryKey: ["profile-completeness", workspaceId] }),
    ]);
  }

  const singleSaveMutation = useMutation({
    mutationFn: ({ questionId, value }: { questionId: string; value: unknown }) =>
      questionnaireApi.upsertAnswer(workspaceId, questionId, value),
    onSuccess: async (_data, variables) => {
      setDirty((prev) => {
        const next = new Set(prev);
        next.delete(variables.questionId);
        return next;
      });
      toast.success(tr.questionnaire.saved);
      await invalidateAfterSave();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, tr.questionnaire.saveFailed));
    },
    onSettled: (_data, _error, variables) => {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.questionId);
        return next;
      });
    },
  });

  const bulkSaveMutation = useMutation({
    mutationFn: (items: BulkAnswerItem[]) => questionnaireApi.bulkUpsert(workspaceId, items),
    onSuccess: async (_data, items) => {
      setDirty((prev) => {
        const next = new Set(prev);
        for (const item of items) next.delete(item.question_id);
        return next;
      });
      toast.success(tr.questionnaire.bulkSaved);
      await invalidateAfterSave();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, tr.questionnaire.saveFailed));
    },
  });

  function setAnswer(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setDirty((prev) => new Set(prev).add(questionId));
  }

  function saveQuestion(questionId: string) {
    const question = questionsById.get(questionId);
    if (!question) return;
    setSavingIds((prev) => new Set(prev).add(questionId));
    const value = prepareValueForSave(question, answers[questionId]);
    singleSaveMutation.mutate({ questionId, value });
  }

  function saveMany(questionIds: string[]) {
    const items: BulkAnswerItem[] = questionIds
      .map((id) => {
        const question = questionsById.get(id);
        if (!question) return null;
        return { question_id: id, value: prepareValueForSave(question, answers[id]) };
      })
      .filter((item): item is BulkAnswerItem => item !== null);

    if (items.length === 0) {
      toast.info(tr.questionnaire.noChanges);
      return;
    }
    bulkSaveMutation.mutate(items);
  }

  function jumpToQuestion(questionId: string) {
    setActiveTab("questions");
    scrollToQuestion(questionId);
  }

  const workspaceName = workspaceQuery.data?.name;
  const missing = missingQuery.data;
  const isLoading = questionsQuery.isLoading;
  const isError = questionsQuery.isError;

  return (
    <DashboardShell
      orgId={orgId}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      title={tr.questionnaire.title}
      breadcrumbs={[
        { label: tr.common.organizations, href: "/organizations" },
        { label: tr.common.workspaces, href: `/o/${orgId}/workspaces` },
        {
          label: workspaceName ?? tr.questionnaire.title,
          href: `/o/${orgId}/w/${workspaceId}/plan`,
        },
        { label: tr.questionnaire.title },
      ]}
    >
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{tr.questionnaire.title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{tr.questionnaire.description}</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : null}

      {isError ? (
        <EmptyState
          title={tr.questionnaire.loadFailed}
          description={getErrorMessage(questionsQuery.error, tr.questionnaire.loadFailed)}
          action={
            <Button variant="outline" onClick={() => questionsQuery.refetch()}>
              {tr.common.retry}
            </Button>
          }
        />
      ) : null}

      {!isLoading && !isError ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {tr.questionnaire.progressLabel}: {answeredCount} {tr.questionnaire.of}{" "}
                  {totalCount}
                </span>
                <Badge variant="secondary">{progressPercent}%</Badge>
              </div>
              <div className="flex items-center gap-3 sm:w-64">
                <Progress value={progressPercent} className="flex-1" />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkSaveMutation.isPending || dirty.size === 0}
                  onClick={() => saveMany(Array.from(dirty))}
                >
                  <SaveAll className="size-4" />
                  {bulkSaveMutation.isPending ? tr.questionnaire.savingAll : tr.questionnaire.saveAll}
                  {dirty.size > 0 ? ` (${dirty.size})` : ""}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="questions">{tr.questionnaire.tabQuestions}</TabsTrigger>
              <TabsTrigger value="missing">
                {tr.questionnaire.tabMissing}
                {missing && missing.missing.length > 0 ? (
                  <Badge variant="destructive" className="ml-1">
                    {missing.missing.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="mt-4 space-y-8">
              {questions.length === 0 ? (
                <EmptyState title={tr.questionnaire.emptyQuestions} description="" />
              ) : visibleQuestions.length === 0 ? (
                <EmptyState
                  title={tr.questionnaire.emptyQuestions}
                  description="Koşullu sorular mevcut cevaplara göre gizlendi."
                />
              ) : (
                categories.map(([category, categoryQuestions]) => {
                  const categoryDirtyIds = categoryQuestions
                    .map((q) => q.id)
                    .filter((id) => dirty.has(id));
                  return (
                    <section key={category} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold tracking-tight">{category}</h2>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={bulkSaveMutation.isPending || categoryDirtyIds.length === 0}
                          onClick={() => saveMany(categoryDirtyIds)}
                        >
                          <SaveAll className="size-4" />
                          {tr.questionnaire.saveAll}
                          {categoryDirtyIds.length > 0 ? ` (${categoryDirtyIds.length})` : ""}
                        </Button>
                      </div>

                      <div className="grid gap-4">
                        {categoryQuestions.map((question) => (
                          <QuestionCard
                            key={question.id}
                            question={question}
                            value={answers[question.id]}
                            isDirty={dirty.has(question.id)}
                            isSaving={savingIds.has(question.id)}
                            onChange={(value) => setAnswer(question.id, value)}
                            onSave={() => saveQuestion(question.id)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="missing" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{tr.questionnaire.missingTitle}</CardTitle>
                  <CardDescription>{tr.questionnaire.missingDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {missing ? (
                    <p className="text-sm text-muted-foreground">
                      {tr.questionnaire.missingAnsweredOf(missing.total_answered, missing.total_required)}
                    </p>
                  ) : null}

                  {missing && missing.missing.length === 0 ? (
                    <EmptyState
                      icon={<CheckCircle2 className="size-5" />}
                      title={tr.questionnaire.missingEmpty}
                      description=""
                    />
                  ) : null}

                  {missing?.missing.map((item) => (
                    <div
                      key={item.question_id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {item.category}
                        </p>
                        <p className="text-sm font-medium">{item.title}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => jumpToQuestion(item.question_id)}
                      >
                        {tr.questionnaire.jumpToQuestion}
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-muted-foreground">
            {tr.questionnaire.saveAndContinueLater}
          </p>
        </div>
      ) : null}
    </DashboardShell>
  );
}

function QuestionCard({
  question,
  value,
  isDirty,
  isSaving,
  onChange,
  onSave,
}: {
  question: WorkspaceQuestionInfo;
  value: unknown;
  isDirty: boolean;
  isSaving: boolean;
  onChange: (value: unknown) => void;
  onSave: () => void;
}) {
  return (
    <Card id={`question-${question.id}`}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{question.title}</CardTitle>
          {question.required ? (
            <Badge variant="outline">{tr.questionnaire.requiredBadge}</Badge>
          ) : null}
          {question.answered && !isDirty ? (
            <Badge variant="secondary">{tr.questionnaire.answeredBadge}</Badge>
          ) : null}
        </div>
        {question.description ? (
          <CardDescription>{question.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        <QuestionInput question={question} value={value} onChange={onChange} />
        {question.help_text ? (
          <p className="text-xs text-muted-foreground">
            {tr.questionnaire.helpTextLabel}: {question.help_text}
          </p>
        ) : null}
        {question.example_answer ? (
          <p className="text-xs text-muted-foreground">
            {tr.questionnaire.exampleAnswerLabel}: {question.example_answer}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" variant={isDirty ? "default" : "outline"} disabled={isSaving} onClick={onSave}>
          <Save className="size-4" />
          {isSaving ? tr.common.saving : tr.common.save}
        </Button>
      </CardFooter>
    </Card>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: WorkspaceQuestionInfo;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (question.input_type) {
    case "short_text":
      return (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "url":
      return (
        <Input
          type="url"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "long_text":
      return (
        <Textarea
          rows={4}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Switch checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} />
          <span className="text-sm text-muted-foreground">
            {value ? tr.questionnaire.booleanYes : tr.questionnaire.booleanNo}
          </span>
        </div>
      );
    case "single_select":
      return (
        <Select
          value={typeof value === "string" ? value : ""}
          onValueChange={(next) => onChange(next)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={tr.questionnaire.selectPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {(question.options ?? []).map((option) => (
              <SelectItem key={option.id} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "multi_select": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {(question.options ?? []).map((option) => {
            const checked = selected.includes(option.value);
            return (
              <Label
                key={option.id}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-normal"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) => {
                    if (next) {
                      onChange([...selected, option.value]);
                    } else {
                      onChange(selected.filter((v) => v !== option.value));
                    }
                  }}
                />
                {option.label}
              </Label>
            );
          })}
        </div>
      );
    }
    default:
      return (
        <Textarea
          rows={4}
          className="font-mono text-sm"
          placeholder={tr.questionnaire.jsonPlaceholder}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}
