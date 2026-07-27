import { apiRequest } from "@/lib/api/client";
import type { LLMProviderName } from "@/lib/api/types";

export type OrgLLMSettings = {
  organization_id: string;
  configured: boolean;
  source: "environment" | "organization";
  provider: string;
  base_url: string;
  model: string;
  timeout_seconds: number;
  max_retries: number;
  enabled: boolean;
  has_provider_api_key: boolean;
  updated_at?: string;
};

export type UpdateOrgLLMSettingsRequest = {
  provider: LLMProviderName;
  base_url?: string;
  model?: string;
  provider_api_key?: string;
  clear_provider_api_key?: boolean;
  timeout_seconds?: number;
  max_retries?: number;
  enabled?: boolean;
  reset_to_env_defaults?: boolean;
};

export type TestOrgLLMConnectionRequest = {
  provider?: LLMProviderName;
  base_url?: string;
  model?: string;
  provider_api_key?: string;
};

export type TestOrgLLMConnectionResponse = {
  provider: string;
  healthy: boolean;
  message: string;
  enabled: boolean;
  source: string;
};

export const llmSettingsApi = {
  get(orgId: string) {
    return apiRequest<OrgLLMSettings>(`/api/v1/organizations/${orgId}/llm-settings`, {
      organizationId: orgId,
    });
  },

  update(orgId: string, body: UpdateOrgLLMSettingsRequest) {
    return apiRequest<OrgLLMSettings>(`/api/v1/organizations/${orgId}/llm-settings`, {
      method: "PUT",
      body,
      organizationId: orgId,
    });
  },

  test(orgId: string, body?: TestOrgLLMConnectionRequest) {
    return apiRequest<TestOrgLLMConnectionResponse>(
      `/api/v1/organizations/${orgId}/llm-settings/test`,
      {
        method: "POST",
        body: body ?? {},
        organizationId: orgId,
      },
    );
  },
};
