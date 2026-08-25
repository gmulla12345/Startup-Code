"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

// Routes that manage their own full-bleed height (e.g. a full-height map)
// shouldn't get the shell's bottom padding reserved for the fixed mobile
// bottom nav — they already account for it in their own layout.
const FULL_BLEED_ROUTES = ["/map"];

export function ContentArea({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFullBleed = FULL_BLEED_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  return <div className={cn("flex-1 min-w-0", isFullBleed ? "pb-0" : "pb-20 md:pb-0")}>{children}</div>;
}
