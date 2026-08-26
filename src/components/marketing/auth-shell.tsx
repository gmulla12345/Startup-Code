import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";
import { brand } from "@/lib/config/brand";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 bg-[radial-gradient(circle_at_20%_20%,var(--forest-soft),var(--background)_60%)]">
        <Logo />
        <div>
          <h2 className="font-display text-4xl font-semibold leading-tight text-foreground max-w-md">
            Experience more of life.
          </h2>
          <p className="text-foreground-muted mt-4 max-w-sm">
            Real recommendations for real experiences — hikes, hidden bars, weekend trips, and everything in between.
          </p>
        </div>
        <p className="text-xs text-foreground-subtle">© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="md:hidden mb-8">
          <Logo />
        </div>
        <div className="w-full max-w-sm mx-auto md:mx-0">
          <h1 className="font-display text-3xl font-semibold text-foreground">{title}</h1>
          <p className="text-foreground-muted mt-2 mb-8">{subtitle}</p>
          {children}
          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
