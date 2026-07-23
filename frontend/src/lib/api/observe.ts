import { apiRequest } from "@/lib/api/client";
import { authStorage } from "@/lib/auth/storage";

export type DocumentQuality = {
  has_heading: boolean;
  min_length_ok: boolean;
  language_declared: boolean;
  quality_score: number;
};

export type MissingRequiredQuestion = {
  question_id: string;
  category: string;
  title: string;
};

export type ReadinessResult = {
  overall: number;
  components: {
    profile: number;
    questionnaire: number;
    documents: number;
  };
  missing_required_questions: MissingRequiredQuestion[];
  succeeded_document_count: number;
  failed_document_count: number;
  computed_at: string;
};

export type RecentDocumentSummary = {
  id: string;
  workspace_id: string;
  title: string;
  document_type: string;
  language: string;
  status: string;
  approval_status?: string;
  provider_name: string;
  model_name: string;
  created_at: string;
  updated_at: string;
  quality: DocumentQuality;
};

export type ObserveSummaryResult = {
  totals: {
    succeeded: number;
    failed: number;
    pending: number;
  };
  last_success_at?: string | null;
  last_failure_at?: string | null;
  providers: Array<{ name: string; count: number }>;
  recent: RecentDocumentSummary[];
};

function workspaceOpts(workspaceId: string) {
  return {
    organizationId: authStorage.getOrganization()?.id ?? null,
    workspaceId,
  };
}

export const observeApi = {
  readiness(workspaceId: string) {
    return apiRequest<ReadinessResult>(
      `/api/v1/workspaces/${workspaceId}/readiness`,
      workspaceOpts(workspaceId),
    );
  },

  summary(workspaceId: string, limit = 10) {
    const q = limit > 0 ? `?limit=${limit}` : "";
    return apiRequest<ObserveSummaryResult>(
      `/api/v1/workspaces/${workspaceId}/observe/summary${q}`,
      workspaceOpts(workspaceId),
    );
  },
};
