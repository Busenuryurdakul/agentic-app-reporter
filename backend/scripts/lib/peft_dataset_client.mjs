import {
  NO_RETRY_STATUSES,
  redactSecrets,
  withRetry,
} from "./peft_dataset_utils.mjs";

export class PeftDatasetClient {
  constructor({ apiBase, token, orgId }) {
    this.apiBase = apiBase || process.env.API_BASE || "http://localhost:8080/api/v1";
    this.token = token;
    this.orgId = orgId;
  }

  async request(method, path, { workspaceId, body, expect, query } = {}) {
    const url = new URL(`${this.apiBase}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      }
    }

    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (this.orgId) headers["X-Organization-ID"] = this.orgId;
    if (workspaceId) headers["X-Workspace-ID"] = workspaceId;

    const exec = async () => {
      const res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      if (expect && !expect.includes(res.status)) {
        const err = new Error(
          `${method} ${path} -> ${res.status} ${redactSecrets(text).slice(0, 500)}`,
        );
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return { status: res.status, data };
    };

    if (NO_RETRY_STATUSES.has(expect?.[0])) {
      return exec();
    }
    return withRetry(() => exec());
  }

  login(email, password) {
    return this.request("POST", "/auth/login", {
      body: { email, password },
      expect: [200],
    }).then((res) => ({
      ...res,
      data: { token: res.data?.token ?? res.data?.data?.token, user: res.data?.user ?? res.data?.data?.user },
    }));
  }

  listWorkspaces() {
    return this.request("GET", `/organizations/${this.orgId}/workspaces`, {
      expect: [200],
    });
  }

  createWorkspace(body) {
    return this.request("POST", `/organizations/${this.orgId}/workspaces`, {
      body,
      expect: [201],
    });
  }

  upsertProfile(workspaceId, body) {
    return this.request("PUT", `/workspaces/${workspaceId}/profile`, {
      workspaceId,
      body,
      expect: [200],
    });
  }

  getProfileCompleteness(workspaceId) {
    return this.request("GET", `/workspaces/${workspaceId}/profile/completeness`, {
      workspaceId,
      expect: [200],
    });
  }

  listWorkspaceQuestions(workspaceId) {
    return this.request("GET", `/workspaces/${workspaceId}/questions`, {
      workspaceId,
      expect: [200],
    });
  }

  missingInformation(workspaceId) {
    return this.request("GET", `/workspaces/${workspaceId}/missing-information`, {
      workspaceId,
      expect: [200],
    });
  }

  bulkUpsertAnswers(workspaceId, answers) {
    return this.request("POST", `/workspaces/${workspaceId}/answers/bulk`, {
      workspaceId,
      body: { answers },
      expect: [200],
    });
  }

  llmHealth() {
    return this.request("GET", "/llm/health", { expect: [200] });
  }

  updateOrgLlmSettings(body) {
    return this.request("PUT", `/organizations/${this.orgId}/llm-settings`, {
      body,
      expect: [200],
    });
  }

  getOrgLlmSettings() {
    return this.request("GET", `/organizations/${this.orgId}/llm-settings`, {
      expect: [200],
    });
  }

  generateDocument(workspaceId, body) {
    return this.request("POST", `/workspaces/${workspaceId}/documents/generate`, {
      workspaceId,
      body,
      expect: [201],
    });
  }

  approveDocument(workspaceId, documentId) {
    return this.request("POST", `/workspaces/${workspaceId}/documents/${documentId}/approve`, {
      workspaceId,
      expect: [200],
    });
  }

  getDocument(workspaceId, documentId) {
    return this.request("GET", `/workspaces/${workspaceId}/documents/${documentId}`, {
      workspaceId,
      expect: [200],
    });
  }

  regenerateDocument(workspaceId, documentId) {
    return this.request("POST", `/workspaces/${workspaceId}/documents/${documentId}/regenerate`, {
      workspaceId,
      expect: [201],
    });
  }
}
