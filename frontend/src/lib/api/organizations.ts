import { apiRequest } from "@/lib/api/client";
import type {
  CreateOrganizationRequest,
  Organization,
  PaginatedResult,
} from "@/lib/api/types";

export const organizationsApi = {
  list(page = 1, perPage = 50) {
    return apiRequest<PaginatedResult<Organization>>(
      `/api/v1/organizations?page=${page}&per_page=${perPage}`,
    );
  },

  get(orgId: string) {
    return apiRequest<Organization>(`/api/v1/organizations/${orgId}`, {
      organizationId: orgId,
    });
  },

  create(payload: CreateOrganizationRequest) {
    return apiRequest<Organization>("/api/v1/organizations", {
      method: "POST",
      body: payload,
    });
  },
};
