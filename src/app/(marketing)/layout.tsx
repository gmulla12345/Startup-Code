import { MarketingNav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

// The pre-login site uses its own light, product-first theme (see
// [data-theme="marketing"] in globals.css), not the app's light/dark pair.
// Every marketing component reads color through the semantic CSS tokens
// (bg-surface, text-foreground, border-border, ...) rather than hardcoded
// hex, so this one attribute restyles the whole route group at once. Scoped
// to this route group only: the logged-in app and auth pages are untouched
// and keep following the visitor's own light/dark preference.
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div data-theme="marketing" className="flex flex-col min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
