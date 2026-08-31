import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "@/components/ui/spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ring)] active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-ember text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:bg-[var(--ember-strong)]",
        secondary: "bg-foreground text-background hover:opacity-90",
        outline: "border border-border-strong bg-transparent text-foreground hover:bg-surface-sunken",
        ghost: "bg-transparent text-foreground hover:bg-surface-sunken",
        forest: "bg-forest text-white hover:bg-[var(--forest-strong)]",
        link: "bg-transparent text-ember underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner and disables the button. Ignored when asChild is set. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    // Slot (asChild) requires exactly one child element, so it can't also
    // receive a spinner as a sibling — render it as a plain button instead.
    if (asChild) {
      return (
        <Slot ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
