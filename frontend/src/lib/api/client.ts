import { ApiError } from "@/lib/api/errors";
import type { ApiErrorBody } from "@/lib/api/types";
import { publishSessionFromStorage } from "@/lib/auth/session-store";
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
      "API'ye ulaşılamadı. NEXT_PUBLIC_API_BASE_URL değerini ve backend'in çalıştığını kontrol edin.",
      0,
    );
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    const errorBody = (payload ?? {}) as ApiErrorBody;
    // Prefer detailed message (e.g. LLM timeout) over generic HTTP status text in `error`.
    const message =
      errorBody.message ||
      errorBody.error ||
      `Request failed with status ${response.status}`;

    if (response.status === 401 && auth) {
      authStorage.clearSession();
      authStorage.setOrganization(null);
      publishSessionFromStorage();
    }

    if (response.status === 403 && auth) {
      // Stale/wrong org in localStorage causes RBAC 403 on every tenant-scoped route.
      authStorage.setOrganization(null);
      publishSessionFromStorage();
    }

    throw new ApiError(message, response.status, errorBody);
  }

  return payload as T;
}

export type ApiDownloadResult = {
  blob: Blob;
  filename: string;
  contentType: string;
};

/** Binary download helper for export endpoints (ZIP / Markdown). */
export async function apiDownload(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiDownloadResult> {
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
      "API'ye ulaşılamadı. NEXT_PUBLIC_API_BASE_URL değerini ve backend'in çalıştığını kontrol edin.",
      0,
    );
  }

  if (!response.ok) {
    const payload = await parseBody(response);
    const errorBody = (payload ?? {}) as ApiErrorBody;
    const message =
      errorBody.message ||
      errorBody.error ||
      `Request failed with status ${response.status}`;

    if (response.status === 401 && auth) {
      authStorage.clearSession();
      authStorage.setOrganization(null);
      publishSessionFromStorage();
    }

    if (response.status === 403 && auth) {
      authStorage.setOrganization(null);
      publishSessionFromStorage();
    }

    throw new ApiError(message, response.status, errorBody);
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/i.exec(disposition);
  const filename = match?.[1] || "download.bin";
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const blob = await response.blob();

  return { blob, filename, contentType };
}
