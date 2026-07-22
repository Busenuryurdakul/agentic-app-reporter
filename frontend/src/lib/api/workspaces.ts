import { apiRequest } from "@/lib/api/client";
import type { CreateWorkspaceRequest, Workspace } from "@/lib/api/types";

export const workspacesApi = {
  list(organizationId: string) {
    return apiRequest<Workspace[]>(
      `/api/v1/organizations/${organizationId}/workspaces`,
      { organizationId },
    );
  },

  get(organizationId: string, workspaceId: string) {
    return apiRequest<Workspace>(
      `/api/v1/organizations/${organizationId}/workspaces/${workspaceId}`,
      { organizationId, workspaceId },
    );
  },

  create(organizationId: string, payload: CreateWorkspaceRequest) {
    return apiRequest<Workspace>(
      `/api/v1/organizations/${organizationId}/workspaces`,
      {
        method: "POST",
        body: payload,
        organizationId,
      },
    );
  },

  update(
    organizationId: string,
    workspaceId: string,
    payload: Partial<CreateWorkspaceRequest> & { status?: string },
  ) {
    return apiRequest<Workspace>(
      `/api/v1/organizations/${organizationId}/workspaces/${workspaceId}`,
      {
        method: "PUT",
        body: payload,
        organizationId,
        workspaceId,
      },
    );
  },

  remove(organizationId: string, workspaceId: string) {
    return apiRequest<null>(
      `/api/v1/organizations/${organizationId}/workspaces/${workspaceId}`,
      {
        method: "DELETE",
        organizationId,
        workspaceId,
      },
    );
  },
};
