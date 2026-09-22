import { MarketingNav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { GrainOverlay } from "@/components/marketing/grain-overlay";

// The pre-login site is now dark end to end, matching the hero photo's own
// cinematic look, not just this-page-happens-to-be-dark-because-someone's-OS-
// is-dark. Every existing marketing/shared component already reads color
// through the app's semantic CSS tokens (bg-surface, text-foreground,
// border-border, ...) rather than hardcoded hex, which is exactly what makes
// this a one-line change instead of a hand-recolor of a dozen files --
// data-theme="dark" here flips every one of those tokens at once. Scoped to
// this route group only: the logged-in app and auth pages are untouched and
// keep following the visitor's own light/dark preference.
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div data-theme="dark" className="flex flex-col min-h-screen bg-background">
      <GrainOverlay />
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
