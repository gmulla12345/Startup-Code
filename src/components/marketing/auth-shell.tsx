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
      <div className="relative isolate hidden md:flex flex-col justify-between overflow-hidden p-10 bg-surface-sunken">
        {/* The landing page's grid and gradient band: decoration only, no text sits on the vivid part. */}
        <span
          aria-hidden
          className="mk-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_80%_60%_at_20%_30%,black,transparent)]"
        />
        <span
          aria-hidden
          className="mk-gradient pointer-events-none absolute -bottom-32 -right-24 -z-10 h-72 w-[26rem] -skew-y-[11deg] opacity-80 [mask-image:linear-gradient(to_right,transparent,black_45%)]"
          // The whole spectrum across the band, still, instead of the stretched, drifting
          // version the hero uses (cropped here it would show only its orange end).
          style={{ backgroundSize: "100% 100%", animation: "none" }}
        />
        <Logo />
        <div>
          <h2 className="font-display text-4xl font-semibold leading-tight tracking-[-0.03em] text-foreground max-w-md">
            Experience <span className="mk-gradient-text">more</span> of life.
          </h2>
          <p className="text-foreground-muted mt-4 max-w-sm">
            Real recommendations for real experiences — hikes, hidden bars, weekend trips, and everything in between.
          </p>
        </div>
        <p className="text-xs text-foreground-subtle">© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
      </div>

      <div className="glow-page flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
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
