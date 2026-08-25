import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-surface-sunken text-foreground-muted",
      ember: "bg-[var(--ember-soft)] text-[var(--ember-strong)]",
      forest: "bg-[var(--forest-soft)] text-[var(--forest-strong)]",
      gold: "bg-[var(--gold-soft)] text-[color:var(--gold)]",
      outline: "border border-border-strong text-foreground-muted",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
