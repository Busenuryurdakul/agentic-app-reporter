"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { organizationsApi } from "@/lib/api/organizations";
import { WorkspacesPage } from "@/features/workspaces/workspaces-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationWorkspacesRoute() {
  const params = useParams<{ orgId: string }>();
  const { setOrganization } = useAuth();

  const orgQuery = useQuery({
    queryKey: ["organization", params.orgId],
    queryFn: () => organizationsApi.get(params.orgId),
  });

  useEffect(() => {
    if (orgQuery.data) {
      setOrganization(orgQuery.data);
    }
  }, [orgQuery.data, setOrganization]);

  if (orgQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Skeleton className="h-40 w-full max-w-xl" />
      </div>
    );
  }

  return <WorkspacesPage orgId={params.orgId} />;
}
