import type { UpsertProfileRequest } from "@/lib/api/profile";
import {
  PROJECT_TECHNOLOGIES,
  type MobilePlatformId,
  type PlatformTypeId,
  type TechnologyId,
  mobilePlatformLabel,
  technologyLabel,
} from "@/lib/constants/project-bootstrap";

export type PreProjectInput = {
  name: string;
  description?: string;
  platformTypes: PlatformTypeId[];
  mobilePlatforms: MobilePlatformId[];
  technologies: TechnologyId[];
};

function firstLabel(
  selected: TechnologyId[],
  category: (typeof PROJECT_TECHNOLOGIES)[number]["category"],
) {
  const match = selected.find((id) =>
    PROJECT_TECHNOLOGIES.some((tech) => tech.id === id && tech.category === category),
  );
  return match ? technologyLabel(match) : "";
}

function labelsForCategory(
  selected: TechnologyId[],
  category: (typeof PROJECT_TECHNOLOGIES)[number]["category"],
) {
  return selected
    .filter((id) =>
      PROJECT_TECHNOLOGIES.some((tech) => tech.id === id && tech.category === category),
    )
    .map(technologyLabel);
}

/** Maps bootstrap answers into a planned project profile (ön proje). */
export function buildPreProjectProfile(input: PreProjectInput): UpsertProfileRequest {
  const platformLabels: string[] = [];
  if (input.platformTypes.includes("web")) {
    platformLabels.push("Web");
  }
  if (input.platformTypes.includes("mobile")) {
    platformLabels.push(...input.mobilePlatforms.map(mobilePlatformLabel));
  }

  const productTypeParts: string[] = [];
  if (input.platformTypes.includes("web")) {
    productTypeParts.push("Web uygulaması");
  }
  if (input.platformTypes.includes("mobile")) {
    const mobileLabels = input.mobilePlatforms.map(mobilePlatformLabel);
    productTypeParts.push(
      mobileLabels.length > 0
        ? `Mobil uygulama (${mobileLabels.join(" + ")})`
        : "Mobil uygulama",
    );
  }
  const productType = productTypeParts.join(" · ") || "Yazılım projesi";

  const frontendTechs = labelsForCategory(input.technologies, "frontend");
  const mobileTechs = labelsForCategory(input.technologies, "mobile");
  const backendTechs = labelsForCategory(input.technologies, "backend");
  const dataTechs = labelsForCategory(input.technologies, "data");
  const infraTechs = labelsForCategory(input.technologies, "infrastructure");

  return {
    project_name: input.name.trim(),
    project_description: input.description?.trim() || "",
    product_type: productType,
    project_status: "planned",
    preferred_document_language: "tr",
    main_use_cases:
      platformLabels.length > 0 ? `Hedef platformlar: ${platformLabels.join(", ")}` : "",
    frontend: {
      platform_types: input.platformTypes,
      platforms: input.mobilePlatforms,
      platform_labels: platformLabels,
      technologies: [...frontendTechs, ...mobileTechs],
      framework: firstLabel(input.technologies, "frontend") || firstLabel(input.technologies, "mobile"),
      language: input.technologies.includes("typescript") ? "TypeScript" : "",
      ui_library: input.technologies.includes("tailwind") ? "Tailwind CSS" : "",
    },
    backend: {
      technologies: backendTechs,
      framework: firstLabel(input.technologies, "backend"),
      language: firstLabel(input.technologies, "backend"),
      database: firstLabel(input.technologies, "data"),
    },
    data: {
      technologies: dataTechs,
      primary_database: firstLabel(input.technologies, "data"),
    },
    infrastructure: {
      technologies: infraTechs,
      hosting_provider: firstLabel(input.technologies, "infrastructure"),
      containerization: input.technologies.includes("docker") ? "Docker" : "",
    },
  };
}
