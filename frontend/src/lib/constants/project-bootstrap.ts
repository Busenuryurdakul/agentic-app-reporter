export const MOBILE_PLATFORMS = [
  { id: "ios", label: "iOS" },
  { id: "android", label: "Android" },
] as const;

export type MobilePlatformId = (typeof MOBILE_PLATFORMS)[number]["id"];

export const TECHNOLOGY_CATEGORIES = [
  { id: "frontend", label: "Frontend" },
  { id: "mobile", label: "Mobil" },
  { id: "backend", label: "Backend" },
  { id: "data", label: "Veri" },
  { id: "infrastructure", label: "Altyapı" },
] as const;

export type TechnologyCategoryId = (typeof TECHNOLOGY_CATEGORIES)[number]["id"];

export const PROJECT_TECHNOLOGIES = [
  { id: "react", label: "React", category: "frontend" },
  { id: "nextjs", label: "Next.js", category: "frontend" },
  { id: "vue", label: "Vue", category: "frontend" },
  { id: "angular", label: "Angular", category: "frontend" },
  { id: "svelte", label: "Svelte", category: "frontend" },
  { id: "typescript", label: "TypeScript", category: "frontend" },
  { id: "tailwind", label: "Tailwind CSS", category: "frontend" },

  { id: "flutter", label: "Flutter", category: "mobile" },
  { id: "react_native", label: "React Native", category: "mobile" },
  { id: "swift", label: "Swift (Native)", category: "mobile" },
  { id: "kotlin", label: "Kotlin (Native)", category: "mobile" },

  { id: "go", label: "Go", category: "backend" },
  { id: "nestjs", label: "NestJS", category: "backend" },
  { id: "django", label: "Django", category: "backend" },
  { id: "fastapi", label: "FastAPI", category: "backend" },
  { id: "spring", label: "Spring Boot", category: "backend" },
  { id: "dotnet", label: ".NET", category: "backend" },
  { id: "nodejs", label: "Node.js", category: "backend" },

  { id: "postgresql", label: "PostgreSQL", category: "data" },
  { id: "mongodb", label: "MongoDB", category: "data" },
  { id: "mysql", label: "MySQL", category: "data" },
  { id: "redis", label: "Redis", category: "data" },

  { id: "docker", label: "Docker", category: "infrastructure" },
  { id: "kubernetes", label: "Kubernetes", category: "infrastructure" },
  { id: "aws", label: "AWS", category: "infrastructure" },
  { id: "vercel", label: "Vercel", category: "infrastructure" },
  { id: "firebase", label: "Firebase", category: "infrastructure" },
] as const;

export type TechnologyId = (typeof PROJECT_TECHNOLOGIES)[number]["id"];

export function isMobilePlatformId(value: string): value is MobilePlatformId {
  return MOBILE_PLATFORMS.some((platform) => platform.id === value);
}

export function isTechnologyId(value: string): value is TechnologyId {
  return PROJECT_TECHNOLOGIES.some((tech) => tech.id === value);
}

export function technologiesByCategory(category: TechnologyCategoryId) {
  return PROJECT_TECHNOLOGIES.filter((tech) => tech.category === category);
}

export function technologyLabel(id: TechnologyId) {
  return PROJECT_TECHNOLOGIES.find((tech) => tech.id === id)?.label ?? id;
}

export function mobilePlatformLabel(id: MobilePlatformId) {
  return MOBILE_PLATFORMS.find((platform) => platform.id === id)?.label ?? id;
}
