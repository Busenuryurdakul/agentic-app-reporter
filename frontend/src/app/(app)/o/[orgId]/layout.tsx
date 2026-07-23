"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useLayoutEffect, type ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { organizationsApi } from "@/lib/api/organizations";
import { publishSessionFromStorage } from "@/lib/auth/session-store";
import { authStorage } from "@/lib/auth/storage";

/**
 * Keeps X-Organization-ID aligned with the org id in the URL before child pages fetch.
 * Prevents stale localhost org ids from causing RBAC 403 on production.
 */
export default function OrgScopedLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ orgId: string }>();
  const { setOrganization } = useAuth();

  useLayoutEffect(() => {
    if (!params.orgId) return;
    authStorage.ensureOrganizationId(params.orgId);
    publishSessionFromStorage();
  }, [params.orgId]);

  const orgQuery = useQuery({
    queryKey: ["organization", params.orgId],
    queryFn: () => organizationsApi.get(params.orgId),
    enabled: Boolean(params.orgId),
    retry: false,
  });

  useLayoutEffect(() => {
    if (orgQuery.data) {
      setOrganization(orgQuery.data);
    }
  }, [orgQuery.data, setOrganization]);

  return children;
}
