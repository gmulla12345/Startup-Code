import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { brand } from "@/lib/config/brand";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("font-display text-2xl font-semibold tracking-tight text-foreground inline-flex items-center gap-0.5", className)}
    >
      {brand.name}
      <span className="text-ember">.</span>
    </Link>
  );
}
