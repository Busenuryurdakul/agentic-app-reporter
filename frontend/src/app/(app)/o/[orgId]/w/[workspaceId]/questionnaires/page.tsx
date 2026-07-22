"use client";

import { useParams } from "next/navigation";
import { QuestionnairePage } from "@/features/questionnaire/questionnaire-page";

export default function QuestionnairesPage() {
  const params = useParams<{ orgId: string; workspaceId: string }>();

  return <QuestionnairePage orgId={params.orgId} workspaceId={params.workspaceId} />;
}
