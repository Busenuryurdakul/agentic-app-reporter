"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MOBILE_PLATFORMS,
  PLATFORM_TYPES,
  PROJECT_TECHNOLOGIES,
  TECHNOLOGY_CATEGORIES,
  technologiesByCategory,
  type MobilePlatformId,
  type PlatformTypeId,
  type TechnologyCategoryId,
  type TechnologyId,
} from "@/lib/constants/project-bootstrap";
import { tr } from "@/lib/i18n/tr";
import type { PreProjectInput } from "@/features/projects/build-pre-project-profile";
import { cn } from "@/lib/utils";

const mobileIds = MOBILE_PLATFORMS.map((p) => p.id) as [MobilePlatformId, ...MobilePlatformId[]];
const platformTypeIds = PLATFORM_TYPES.map((p) => p.id) as [PlatformTypeId, ...PlatformTypeId[]];

const POPULAR_TECH_IDS: TechnologyId[] = ["nextjs", "react", "go", "postgresql", "flutter"];

const createSchema = z
  .object({
    name: z.string().min(2, "Proje adı en az 2 karakter olmalı"),
    description: z.string().optional(),
    platformTypes: z.array(z.enum(platformTypeIds)).min(1, tr.org.platformTypesRequired),
    mobilePlatforms: z.array(z.enum(mobileIds)),
    technologies: z.array(z.string()).min(1, "En az bir teknoloji seçin"),
  })
  .refine(
    (values) => !values.platformTypes.includes("mobile") || values.mobilePlatforms.length >= 1,
    {
      message: tr.org.mobilePlatformsRequired,
      path: ["mobilePlatforms"],
    },
  );

type CreateValues = z.infer<typeof createSchema>;

type CreateProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onSubmit: (values: PreProjectInput) => void;
  triggerLabel?: string;
  showTrigger?: boolean;
};

function orderedCategories(platformTypes: PlatformTypeId[]): TechnologyCategoryId[] {
  const hasWeb = platformTypes.includes("web");
  const hasMobile = platformTypes.includes("mobile");

  if (hasWeb && hasMobile) {
    return ["frontend", "mobile", "backend", "data", "infrastructure"];
  }
  if (hasMobile) {
    return ["mobile", "backend", "data", "infrastructure", "frontend"];
  }
  if (hasWeb) {
    return ["frontend", "backend", "data", "infrastructure", "mobile"];
  }
  return TECHNOLOGY_CATEGORIES.map((category) => category.id);
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  isPending = false,
  onSubmit,
  triggerLabel = tr.org.new,
  showTrigger = true,
}: CreateProjectDialogProps) {
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      description: "",
      platformTypes: [],
      mobilePlatforms: [],
      technologies: [],
    },
  });

  const selectedPlatformTypes = form.watch("platformTypes");
  const showMobilePlatforms = selectedPlatformTypes.includes("mobile");
  const visibleCategories = orderedCategories(selectedPlatformTypes);

  function toggleValue<T extends string>(current: T[], value: T, checked: boolean): T[] {
    if (checked) return current.includes(value) ? current : [...current, value];
    return current.filter((item) => item !== value);
  }

  function togglePlatformType(type: PlatformTypeId) {
    const current = form.getValues("platformTypes");
    const next = current.includes(type)
      ? current.filter((item) => item !== type)
      : [...current, type];

    form.setValue("platformTypes", next, { shouldValidate: true });
    if (!next.includes("mobile")) {
      form.setValue("mobilePlatforms", [], { shouldValidate: true });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) form.reset();
      }}
    >
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{tr.org.createTitle}</DialogTitle>
          <DialogDescription>{tr.org.createDescription}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={form.handleSubmit((values) =>
            onSubmit({
              name: values.name,
              description: values.description,
              platformTypes: values.platformTypes,
              mobilePlatforms: values.mobilePlatforms,
              technologies: values.technologies as TechnologyId[],
            }),
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="project-name">{tr.org.name}</Label>
            <Input
              id="project-name"
              placeholder="Örn. Agentic App Reporter"
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">{tr.org.descriptionLabel}</Label>
            <Textarea
              id="project-description"
              placeholder={tr.org.descriptionPlaceholder}
              rows={2}
              {...form.register("description")}
            />
          </div>

          <div className="space-y-3">
            <div>
              <Label>{tr.org.platforms}</Label>
              <p className="mt-1 text-xs text-muted-foreground">{tr.org.platformsHint}</p>
            </div>
            <Controller
              control={form.control}
              name="platformTypes"
              render={({ field }) => (
                <div className="inline-flex w-full rounded-lg border border-border bg-muted/30 p-1 sm:w-auto">
                  {PLATFORM_TYPES.map((platformType) => {
                    const active = field.value.includes(platformType.id);
                    return (
                      <button
                        key={platformType.id}
                        type="button"
                        className={cn(
                          "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-6",
                          active
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        onClick={() => togglePlatformType(platformType.id)}
                      >
                        {platformType.label}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {form.formState.errors.platformTypes ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.platformTypes.message}
              </p>
            ) : null}
          </div>

          {showMobilePlatforms ? (
            <div className="ml-1 space-y-3 border-l-2 border-teal-700/30 pl-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <div>
                <Label>{tr.org.mobilePlatforms}</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tr.org.mobilePlatformsHint}
                </p>
              </div>
              <Controller
                control={form.control}
                name="mobilePlatforms"
                render={({ field }) => (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {MOBILE_PLATFORMS.map((platform) => {
                      const checked = field.value.includes(platform.id);
                      return (
                        <label
                          key={platform.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-muted/40"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) =>
                              field.onChange(
                                toggleValue(field.value, platform.id, value === true),
                              )
                            }
                          />
                          <span className="text-sm font-medium">{platform.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              />
              {form.formState.errors.mobilePlatforms ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.mobilePlatforms.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            <div>
              <Label>{tr.org.technologies}</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                {tr.org.technologiesHint}
              </p>
            </div>
            <Controller
              control={form.control}
              name="technologies"
              render={({ field }) => (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {tr.org.popularTechnologies}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_TECH_IDS.map((techId) => {
                        const tech = PROJECT_TECHNOLOGIES.find((item) => item.id === techId);
                        if (!tech) return null;
                        const checked = field.value.includes(tech.id);
                        return (
                          <button
                            key={tech.id}
                            type="button"
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm transition-colors",
                              checked
                                ? "border-teal-700/40 bg-teal-50 text-teal-950"
                                : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                            )}
                            onClick={() =>
                              field.onChange(toggleValue(field.value, tech.id, !checked))
                            }
                          >
                            {tech.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {visibleCategories.map((categoryId) => {
                    const category = TECHNOLOGY_CATEGORIES.find((item) => item.id === categoryId);
                    if (!category) return null;
                    return (
                      <div key={category.id} className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {category.label}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {technologiesByCategory(category.id).map((tech) => {
                            const checked = field.value.includes(tech.id);
                            return (
                              <button
                                key={tech.id}
                                type="button"
                                className={cn(
                                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                                  checked
                                    ? "border-teal-700/40 bg-teal-50 text-teal-950"
                                    : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                                )}
                                onClick={() =>
                                  field.onChange(toggleValue(field.value, tech.id, !checked))
                                }
                              >
                                {tech.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            />
            {form.formState.errors.technologies ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.technologies.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tr.org.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? tr.org.creating : tr.org.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
