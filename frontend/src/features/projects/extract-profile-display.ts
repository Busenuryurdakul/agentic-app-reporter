import type { ProfileInfo, ProfileSection } from "@/lib/api/profile";

const WEB_FRONTEND_LABELS = new Set(["React", "Next.js", "Vue", "Angular", "Svelte"]);

function stringArray(section: ProfileSection | null | undefined, key: string): string[] {
  const value = section?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function sectionString(section: ProfileSection | null | undefined, key: string): string {
  const value = section?.[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  return "";
}

/** Mobile / web platform labels stored on the project profile. */
export function extractPlatforms(profile: ProfileInfo): string[] {
  const platforms = [...stringArray(profile.frontend, "platform_labels")];

  const frontendTechs = stringArray(profile.frontend, "technologies");
  const framework = sectionString(profile.frontend, "framework");
  const hasWebStack =
    frontendTechs.some((label) => WEB_FRONTEND_LABELS.has(label)) ||
    (framework ? WEB_FRONTEND_LABELS.has(framework) : false);

  if (hasWebStack && !platforms.includes("Web")) {
    platforms.push("Web");
  }

  return platforms;
}

/** Distinct technology labels from profile JSON sections. */
export function extractTechnologies(profile: ProfileInfo, limit = 5): string[] {
  const labels = new Set<string>();
  const sections = [
    profile.frontend,
    profile.backend,
    profile.data,
    profile.infrastructure,
    profile.ai,
  ];

  for (const section of sections) {
    for (const label of stringArray(section, "technologies")) {
      labels.add(label);
    }
    for (const key of [
      "framework",
      "language",
      "database",
      "primary_database",
      "ui_library",
      "hosting_provider",
    ] as const) {
      const value = sectionString(section, key);
      if (value) labels.add(value);
    }
  }

  return [...labels].slice(0, limit);
}

export function projectStatusKey(profile: ProfileInfo): string {
  return profile.project_status?.trim() || "planned";
}

const KNOWN_STATUS_KEYS = new Set([
  "planned",
  "in_progress",
  "active",
  "maintenance",
  "archived",
]);

/** Prefer profile status; fall back to workspace status when recognized. */
export function resolveProjectStatusKey(
  profile: ProfileInfo | null | undefined,
  workspaceStatus: string,
): string {
  if (profile?.project_status?.trim()) {
    return profile.project_status.trim();
  }
  const normalized = workspaceStatus?.trim();
  if (normalized && KNOWN_STATUS_KEYS.has(normalized)) {
    return normalized;
  }
  return "planned";
}
