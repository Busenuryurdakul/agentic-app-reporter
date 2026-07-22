import { apiRequest } from "@/lib/api/client";
import { authStorage } from "@/lib/auth/storage";

export type QuestionOptionInfo = {
  id: string;
  value: string;
  label: string;
  display_order: number;
};

export type QuestionInfo = {
  id: string;
  set_id: string;
  key: string;
  category: string;
  title: string;
  description: string;
  input_type:
    | "short_text"
    | "long_text"
    | "single_select"
    | "multi_select"
    | "boolean"
    | "number"
    | "url"
    | "code"
    | "json"
    | "key_value"
    | string;
  required: boolean;
  display_order: number;
  validation_rules?: unknown;
  visibility_rules?: unknown;
  help_text?: string;
  example_answer?: string;
  active: boolean;
  options?: QuestionOptionInfo[];
};

export type WorkspaceQuestionInfo = QuestionInfo & {
  /** Present only when the workspace has recorded a non-empty answer. */
  answer?: unknown;
  answered: boolean;
  /** Server-evaluated visibility; clients may also re-evaluate locally. */
  visible?: boolean;
};

export type WorkspaceQuestionsResult = {
  set_id: string;
  set_key: string;
  questions: WorkspaceQuestionInfo[];
};

export type MissingQuestionInfo = {
  question_id: string;
  category: string;
  title: string;
};

export type MissingInformationResult = {
  set_id: string;
  missing: MissingQuestionInfo[];
  total_required: number;
  total_answered: number;
};

export type AnswerInfo = {
  id: string;
  organization_id: string;
  workspace_id: string;
  question_id: string;
  value: unknown;
  created_at: string;
  updated_at: string;
};

export type BulkAnswerItem = {
  question_id: string;
  value: unknown;
};

function orgHeader() {
  return authStorage.getOrganization()?.id ?? null;
}

export const questionnaireApi = {
  listWorkspaceQuestions(workspaceId: string) {
    return apiRequest<WorkspaceQuestionsResult>(
      `/api/v1/workspaces/${workspaceId}/questions`,
      { organizationId: orgHeader(), workspaceId },
    );
  },

  upsertAnswer(workspaceId: string, questionId: string, value: unknown) {
    return apiRequest<AnswerInfo>(
      `/api/v1/workspaces/${workspaceId}/answers/${questionId}`,
      {
        method: "PUT",
        body: { value },
        organizationId: orgHeader(),
        workspaceId,
      },
    );
  },

  bulkUpsert(workspaceId: string, answers: BulkAnswerItem[]) {
    return apiRequest<AnswerInfo[]>(`/api/v1/workspaces/${workspaceId}/answers/bulk`, {
      method: "POST",
      body: { answers },
      organizationId: orgHeader(),
      workspaceId,
    });
  },

  missingInformation(workspaceId: string) {
    return apiRequest<MissingInformationResult>(
      `/api/v1/workspaces/${workspaceId}/missing-information`,
      { organizationId: orgHeader(), workspaceId },
    );
  },
};
