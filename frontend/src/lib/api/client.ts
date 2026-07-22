import { ApiError } from "@/lib/api/errors";
import type { ApiErrorBody } from "@/lib/api/types";
import { authStorage } from "@/lib/auth/storage";
import { appConfig } from "@/lib/config";

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  organizationId?: string | null;
  workspaceId?: string | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  auth?: boolean;
};

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return text || null;
  }

  return response.json();
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    token = authStorage.getToken(),
    organizationId = authStorage.getOrganization()?.id ?? null,
    workspaceId = null,
    headers = {},
    signal,
    auth = true,
  } = options;

  const requestHeaders = new Headers(headers);

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    if (!token) {
      throw new ApiError("Authentication required", 401);
    }
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (organizationId) {
    requestHeaders.set("X-Organization-ID", organizationId);
  }

  if (workspaceId) {
    requestHeaders.set("X-Workspace-ID", workspaceId);
  }

  const url = `${appConfig.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    throw new ApiError(
      "Unable to reach the API. Confirm NEXT_PUBLIC_API_BASE_URL and that the backend is running.",
      0,
    );
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    const errorBody = (payload ?? {}) as ApiErrorBody;
    const message =
      errorBody.error ||
      errorBody.message ||
      `Request failed with status ${response.status}`;

    if (response.status === 401 && auth) {
      authStorage.clearSession();
    }

    throw new ApiError(message, response.status, errorBody);
  }

  return payload as T;
}
