import type {
  MCPDocumentsResult,
  MCPLLMHealthResult,
  MCPReadinessResult,
} from "@/lib/api/mcp";
import { tr } from "@/lib/i18n/tr";

export type AgentMessage = {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
};

export type AgentPreset = {
  id: string;
  label: string;
  tool: "workspace_readiness" | "list_documents" | "llm_health";
};

export const AGENT_PRESETS: AgentPreset[] = [
  { id: "readiness", label: tr.agent.presetReadiness, tool: "workspace_readiness" },
  { id: "documents", label: tr.agent.presetDocuments, tool: "list_documents" },
  { id: "llm", label: tr.agent.presetLlmHealth, tool: "llm_health" },
];

export function formatReadinessResult(result: MCPReadinessResult): string {
  const lines = [
    `${tr.agent.readinessOverall}: ${result.overall}/100`,
  ];

  if (result.components) {
    lines.push(
      `${tr.agent.readinessProfile}: ${result.components.profile ?? "—"}`,
      `${tr.agent.readinessQuestionnaire}: ${result.components.questionnaire ?? "—"}`,
      `${tr.agent.readinessDocuments}: ${result.components.documents ?? "—"}`,
    );
  }

  if (result.total_required !== undefined) {
    lines.push(
      `${tr.agent.answeredRequired}: ${result.total_answered ?? 0}/${result.total_required}`,
    );
  }

  const missing = result.missing_required_questions ?? [];
  if (missing.length > 0) {
    lines.push("", `${tr.agent.missingQuestions} (${missing.length}):`);
    for (const item of missing.slice(0, 8)) {
      const prefix = item.category ? `[${item.category}] ` : "";
      lines.push(`• ${prefix}${item.title ?? item.question_id}`);
    }
    if (missing.length > 8) {
      lines.push(`… +${missing.length - 8}`);
    }
  }

  return lines.join("\n");
}

export function formatDocumentsResult(result: MCPDocumentsResult): string {
  const docs = result.documents ?? [];
  if (docs.length === 0) {
    return tr.agent.noDocuments;
  }

  const lines = [`${tr.agent.documentCount}: ${docs.length}`, ""];
  for (const doc of docs.slice(0, 10)) {
    lines.push(
      `• ${doc.title} — ${doc.status}${doc.approval_status ? ` (${doc.approval_status})` : ""}`,
    );
  }
  if (docs.length > 10) {
    lines.push(`… +${docs.length - 10}`);
  }
  return lines.join("\n");
}

export function formatLlmHealthResult(result: MCPLLMHealthResult): string {
  const status = result.healthy ? tr.agent.llmHealthy : tr.agent.llmUnhealthy;
  return [
    `${tr.agent.llmProvider}: ${result.provider}`,
    `${tr.agent.llmStatus}: ${status}`,
    result.message ? `${tr.agent.llmMessage}: ${result.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function presetUserMessage(preset: AgentPreset): string {
  return preset.label;
}
