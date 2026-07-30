"use client";

import { useMutation } from "@tanstack/react-query";
import { mcpApi } from "@/lib/api/mcp";
import { getErrorMessage } from "@/lib/api/errors";
import {
  formatDocumentsResult,
  formatLlmHealthResult,
  formatReadinessResult,
  type AgentPreset,
} from "@/features/agent/agent-formatters";

export function useAgentToolCall(orgId: string, workspaceId: string) {
  return useMutation({
    mutationFn: async (preset: AgentPreset) => {
      switch (preset.tool) {
        case "workspace_readiness": {
          const res = await mcpApi.workspaceReadiness(orgId, workspaceId);
          return formatReadinessResult(res.result);
        }
        case "list_documents": {
          const res = await mcpApi.listDocuments(orgId, workspaceId);
          return formatDocumentsResult(res.result);
        }
        case "llm_health": {
          const res = await mcpApi.llmHealth(orgId, workspaceId);
          return formatLlmHealthResult(res.result);
        }
        default:
          throw new Error("Unknown tool");
      }
    },
  });
}

export function getAgentToolError(error: unknown): string {
  return getErrorMessage(error, "MCP aracı çalıştırılamadı");
}
