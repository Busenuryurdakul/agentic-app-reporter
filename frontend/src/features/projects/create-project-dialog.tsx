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
  TECHNOLOGY_CATEGORIES,
  technologiesByCategory,
  type MobilePlatformId,
  type TechnologyId,
} from "@/lib/constants/project-bootstrap";
import { tr } from "@/lib/i18n/tr";
import type { PreProjectInput } from "@/features/projects/build-pre-project-profile";

const mobileIds = MOBILE_PLATFORMS.map((p) => p.id) as [MobilePlatformId, ...MobilePlatformId[]];

const createSchema = z.object({
  name: z.string().min(2, "Proje adı en az 2 karakter olmalı"),
  description: z.string().optional(),
  mobilePlatforms: z.array(z.enum(mobileIds)).min(1, "En az bir mobil platform seçin"),
  technologies: z.array(z.string()).min(1, "En az bir teknoloji seçin"),
});

type CreateValues = z.infer<typeof createSchema>;

type CreateProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onSubmit: (values: PreProjectInput) => void;
  triggerLabel?: string;
  showTrigger?: boolean;
};

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
      mobilePlatforms: [],
      technologies: [],
    },
  });

  function toggleValue<T extends string>(current: T[], value: T, checked: boolean): T[] {
    if (checked) return current.includes(value) ? current : [...current, value];
    return current.filter((item) => item !== value);
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
              mobilePlatforms: values.mobilePlatforms,
              technologies: values.technologies as TechnologyId[],
            }),
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="project-name">{tr.org.name}</Label>
            <Input
              id="project-name"
              placeholder="Örn. Payments Mobile"
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
                  {TECHNOLOGY_CATEGORIES.map((category) => (
                    <div key={category.id} className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {category.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {technologiesByCategory(category.id).map((tech) => {
                          const checked = field.value.includes(tech.id);
                          return (
                            <label
                              key={tech.id}
                              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                                checked
                                  ? "border-teal-700/40 bg-teal-50 text-teal-950"
                                  : "border-border hover:bg-muted/40"
                              }`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) =>
                                  field.onChange(
                                    toggleValue(field.value, tech.id, value === true),
                                  )
                                }
                              />
                              {tech.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
