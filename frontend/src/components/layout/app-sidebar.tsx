"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  Settings,
  Telescope,
} from "lucide-react";
import { tr } from "@/lib/i18n/tr";
import { cn } from "@/lib/utils";

const navItems = [
  { label: tr.nav.plan, segment: "plan", icon: LayoutDashboard },
  { label: tr.nav.questionnaires, segment: "questionnaires", icon: ClipboardList },
  { label: tr.nav.generate, segment: "generate", icon: FileText },
  { label: tr.nav.observe, segment: "observe", icon: Telescope },
  { label: tr.nav.settings, segment: "settings", icon: Settings },
] as const;

type AppSidebarProps = {
  orgId: string;
  workspaceId?: string;
  className?: string;
  onNavigate?: () => void;
};

export function AppSidebar({
  orgId,
  workspaceId,
  className,
  onNavigate,
}: AppSidebarProps) {
  const pathname = usePathname();
  const base = workspaceId
    ? `/o/${orgId}/w/${workspaceId}`
    : `/o/${orgId}/workspaces`;

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="border-b border-sidebar-border px-5 py-4">
        <Link href={`/o/${orgId}/workspaces`} onClick={onNavigate} className="block">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {tr.brandSidebar}
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug">
            {tr.brandSidebarSub}
          </p>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {!workspaceId ? (
          <Link
            href={`/o/${orgId}/workspaces`}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname.includes("/workspaces")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent/70",
            )}
          >
            <LayoutDashboard className="size-4" />
            {tr.nav.workspaces}
          </Link>
        ) : (
          navItems.map((item) => {
            const href = `${base}/${item.segment}`;
            const active = pathname.startsWith(href);
            const Icon = item.icon;
            return (
              <Link
                key={item.segment}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/70",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })
        )}
      </nav>

      <div className="border-t border-sidebar-border p-4 text-xs text-muted-foreground">
        {tr.brandFooter}
      </div>
    </aside>
  );
}
