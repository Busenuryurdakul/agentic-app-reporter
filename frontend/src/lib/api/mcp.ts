import { apiRequest } from "@/lib/api/client";
import { authStorage } from "@/lib/auth/storage";

export type MCPToolDefinition = {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
};

export type MCPToolsResponse = {
  tools: MCPToolDefinition[];
};

export type MCPToolCallResponse<T = unknown> = {
  tool: string;
  result: T;
};

export type MCPReadinessResult = {
  overall: number;
  components?: {
    profile?: number;
    questionnaire?: number;
    documents?: number;
  };
  total_required?: number;
  total_answered?: number;
  missing_required_questions?: Array<{
    question_id: string;
    category?: string;
    title?: string;
  }>;
  succeeded_document_count?: number;
  failed_document_count?: number;
};

export type MCPDocumentsResult = {
  documents: Array<{
    id: string;
    title: string;
    status: string;
    approval_status?: string;
    document_type?: string;
    created_at?: string;
  }>;
};

export type MCPLLMHealthResult = {
  provider: string;
  healthy: boolean;
  enabled?: boolean;
  message?: string;
};

function workspaceOpts(orgId: string, workspaceId: string) {
  return {
    organizationId: orgId || authStorage.getOrganization()?.id || null,
    workspaceId,
  };
}

export const mcpApi = {
  listTools() {
    return apiRequest<MCPToolsResponse>("/api/v1/mcp/tools");
  },

  health() {
    return apiRequest<{ status: string; auth_method?: string }>("/api/v1/mcp/health");
  },

  callTool<T = unknown>(
    name: string,
    args: Record<string, unknown>,
    orgId: string,
    workspaceId: string,
  ) {
    return apiRequest<MCPToolCallResponse<T>>("/api/v1/mcp/tools/call", {
      method: "POST",
      body: {
        name,
        arguments: { workspace_id: workspaceId, ...args },
      },
      ...workspaceOpts(orgId, workspaceId),
    });
  },

  workspaceReadiness(orgId: string, workspaceId: string) {
    return this.callTool<MCPReadinessResult>(
      "workspace_readiness",
      {},
      orgId,
      workspaceId,
    );
  },

  listDocuments(orgId: string, workspaceId: string, limit = 20) {
    return this.callTool<MCPDocumentsResult>(
      "list_documents",
      { limit },
      orgId,
      workspaceId,
    );
  },

  llmHealth(orgId: string, workspaceId: string) {
    return this.callTool<MCPLLMHealthResult>("llm_health", {}, orgId, workspaceId);
  },
};
