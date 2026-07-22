import { apiRequest } from "@/lib/api/client";
import { authStorage } from "@/lib/auth/storage";

export type GenerateDocumentRequest = {
  title?: string;
  language?: string;
};

export type DocumentSummary = {
  id: string;
  workspace_id: string;
  title: string;
  document_type: string;
  language: string;
  status: string;
  provider_name: string;
  model_name: string;
  created_at: string;
  updated_at: string;
};

export type DocumentInfo = DocumentSummary & {
  organization_id: string;
  markdown_body: string;
  error_message?: string;
  source_fingerprint?: string;
  created_by?: string | null;
};

export type DocumentListResult = {
  documents: DocumentSummary[];
};

export type ProviderHealthInfo = {
  provider: string;
  healthy: boolean;
  message: string;
  enabled?: boolean;
};

function workspaceOpts(workspaceId: string) {
  return {
    organizationId: authStorage.getOrganization()?.id ?? null,
    workspaceId,
  };
}

export const documentsApi = {
  list(workspaceId: string, limit = 20) {
    const q = limit > 0 ? `?limit=${limit}` : "";
    return apiRequest<DocumentListResult>(
      `/api/v1/workspaces/${workspaceId}/documents${q}`,
      workspaceOpts(workspaceId),
    );
  },

  get(workspaceId: string, documentId: string) {
    return apiRequest<DocumentInfo>(
      `/api/v1/workspaces/${workspaceId}/documents/${documentId}`,
      workspaceOpts(workspaceId),
    );
  },

  generate(workspaceId: string, body: GenerateDocumentRequest = {}) {
    return apiRequest<DocumentInfo>(
      `/api/v1/workspaces/${workspaceId}/documents/generate`,
      {
        method: "POST",
        body,
        ...workspaceOpts(workspaceId),
      },
    );
  },

  regenerate(workspaceId: string, documentId: string) {
    return apiRequest<DocumentInfo>(
      `/api/v1/workspaces/${workspaceId}/documents/${documentId}/regenerate`,
      {
        method: "POST",
        ...workspaceOpts(workspaceId),
      },
    );
  },

  health() {
    return apiRequest<ProviderHealthInfo>("/api/v1/llm/health");
  },
};
