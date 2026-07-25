"use client";

import { Badge } from "@/components/ui/badge";
import type { ProviderHealthInfo } from "@/lib/api/documents";
import { tr } from "@/lib/i18n/tr";

type LlmHealthBadgeProps = {
  health?: ProviderHealthInfo | null;
  isLoading?: boolean;
  isError?: boolean;
};

export function LlmHealthBadge({ health, isLoading, isError }: LlmHealthBadgeProps) {
  if (isLoading) {
    return <Badge variant="outline">{tr.generate.healthChecking}</Badge>;
  }

  if (isError || !health) {
    return <Badge variant="destructive">{tr.generate.healthFail}</Badge>;
  }

  if (health.healthy) {
    return (
      <Badge className="bg-teal-700 text-white hover:bg-teal-700">
        {tr.generate.healthOk(health.provider)}
      </Badge>
    );
  }

  return (
    <Badge variant="destructive">
      {tr.generate.healthFailDetail(health?.provider ?? "llm", health?.message ?? "")}
    </Badge>
  );
}
