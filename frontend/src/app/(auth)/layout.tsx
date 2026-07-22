import type { ReactNode } from "react";
import { tr } from "@/lib/i18n/tr";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.16),_transparent_42%),linear-gradient(160deg,#f4f7f6_0%,#e7eeec_45%,#dfe8e6_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-24 size-72 rounded-full bg-teal-700/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 size-80 rounded-full bg-slate-900/5 blur-3xl" />
      <div className="relative z-10 flex w-full flex-col items-center gap-8">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-900/70">
            {tr.brandEyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {tr.brandTitle}
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
}
