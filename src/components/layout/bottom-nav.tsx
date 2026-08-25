"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/lib/config/brand";
import { NAV_ICONS } from "./icons";
import { cn } from "@/lib/utils/cn";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-6 h-16">
        {nav.primary.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1"
            >
              <Icon className={cn("h-5 w-5", active ? "text-ember" : "text-foreground-subtle")} strokeWidth={active ? 2.5 : 2} />
              <span className={cn("text-[10px] font-medium", active ? "text-ember" : "text-foreground-subtle")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
