import { apiDownload } from "@/lib/api/client";
import { authStorage } from "@/lib/auth/storage";

export type ExportPackageRequest = {
  document_ids?: string[];
  format?: "markdown_zip";
};

function workspaceOpts(workspaceId: string) {
  return {
    organizationId: authStorage.getOrganization()?.id ?? null,
    workspaceId,
  };
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const exportsApi = {
  async create(workspaceId: string, body: ExportPackageRequest = {}) {
    const result = await apiDownload(`/api/v1/workspaces/${workspaceId}/exports`, {
      method: "POST",
      body: {
        document_ids: body.document_ids,
        format: body.format ?? "markdown_zip",
      },
      ...workspaceOpts(workspaceId),
    });
    triggerBrowserDownload(result.blob, result.filename);
    return result;
  },
};
