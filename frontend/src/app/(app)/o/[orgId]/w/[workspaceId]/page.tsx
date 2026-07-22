"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function WorkspaceIndexRoute() {
  const params = useParams<{ orgId: string; workspaceId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/o/${params.orgId}/w/${params.workspaceId}/plan`);
  }, [params.orgId, params.workspaceId, router]);

  return null;
}
