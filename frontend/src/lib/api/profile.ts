import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { authStorage } from "@/lib/auth/storage";

/**
 * A JSONB configuration section on the project profile (frontend, backend,
 * data, infrastructure, ai, development_standards). Keys are free-form.
 */
export type ProfileSection = Record<string, unknown>;

export type ProfileInfo = {
  id: string;
  organization_id: string;
  workspace_id: string;
  project_name: string;
  project_description: string;
  product_type: string;
  target_users: string;
  main_problem: string;
  main_use_cases: string;
  project_status: string;
  preferred_document_language: string;
  frontend: ProfileSection | null;
  backend: ProfileSection | null;
  data: ProfileSection | null;
  infrastructure: ProfileSection | null;
  ai: ProfileSection | null;
  development_standards: ProfileSection | null;
  created_at: string;
  updated_at: string;
};

export type UpsertProfileRequest = Partial<{
  project_name: string;
  project_description: string;
  product_type: string;
  target_users: string;
  main_problem: string;
  main_use_cases: string;
  project_status: string;
  preferred_document_language: string;
  frontend: ProfileSection;
  backend: ProfileSection;
  data: ProfileSection;
  infrastructure: ProfileSection;
  ai: ProfileSection;
  development_standards: ProfileSection;
}>;

export type CompletenessResult = {
  overall: number;
  sections: Record<string, number>;
  missing_fields: string[];
};

/** Empty profile placeholder used when no profile has been saved yet (404). */
export function emptyProfile(): ProfileInfo {
  return {
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
  };
}

export const profileApi = {
  async get(workspaceId: string): Promise<ProfileInfo> {
    try {
      return await apiRequest<ProfileInfo>(`/api/v1/workspaces/${workspaceId}/profile`, {
        organizationId: authStorage.getOrganization()?.id ?? null,
        workspaceId,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return emptyProfile();
      }
      throw error;
    }
  },

  upsert(workspaceId: string, body: UpsertProfileRequest) {
    return apiRequest<ProfileInfo>(`/api/v1/workspaces/${workspaceId}/profile`, {
      method: "PUT",
      body,
      organizationId: authStorage.getOrganization()?.id ?? null,
      workspaceId,
    });
  },

  completeness(workspaceId: string) {
    return apiRequest<CompletenessResult>(
      `/api/v1/workspaces/${workspaceId}/profile/completeness`,
      {
        organizationId: authStorage.getOrganization()?.id ?? null,
        workspaceId,
      },
    );
  },
};
