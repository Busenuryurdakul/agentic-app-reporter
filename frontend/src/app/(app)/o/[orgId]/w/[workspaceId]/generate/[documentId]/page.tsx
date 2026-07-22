"use client";

import { useParams } from "next/navigation";
import { DocumentViewer } from "@/features/generate/document-viewer";

export default function DocumentViewerRoutePage() {
  const params = useParams<{ orgId: string; workspaceId: string; documentId: string }>();

  return (
    <DocumentViewer
      orgId={params.orgId}
      workspaceId={params.workspaceId}
      documentId={params.documentId}
    />
  );
}
