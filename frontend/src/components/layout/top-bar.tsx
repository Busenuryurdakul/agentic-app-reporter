"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, LogOut, Menu, UserRound } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { tr } from "@/lib/i18n/tr";

type TopBarProps = {
  orgId?: string;
  workspaceId?: string;
  workspaceName?: string;
  title?: string;
};

export function TopBar({
  orgId,
  workspaceId,
  workspaceName,
  title,
}: TopBarProps) {
  const { user, organization, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
      {orgId ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="md:hidden">
              <Menu className="size-4" />
              <span className="sr-only">Navigasyonu aç</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigasyon</SheetTitle>
            </SheetHeader>
            <AppSidebar
              orgId={orgId}
              workspaceId={workspaceId}
              className="w-full border-0"
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {title ?? workspaceName ?? organization?.name ?? tr.common.dashboard}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="hidden gap-2 sm:inline-flex">
            <Building2 className="size-3.5" />
            <span className="max-w-40 truncate">
              {organization?.name ?? tr.org.organization}
            </span>
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{tr.org.organization}</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href="/organizations">{tr.org.switch}</Link>
          </DropdownMenuItem>
          {orgId ? (
            <DropdownMenuItem asChild>
              <Link href={`/o/${orgId}/workspaces`}>{tr.nav.workspaces}</Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <UserRound className="size-3.5" />
            <span className="hidden max-w-36 truncate sm:inline">
              {user ? `${user.first_name} ${user.last_name}` : tr.auth.account}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {user ? `${user.first_name} ${user.last_name}` : tr.auth.signedOut}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            <LogOut className="size-4" />
            {tr.auth.signOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
