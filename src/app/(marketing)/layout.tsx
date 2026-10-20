import { MarketingNav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

// The pre-login site and the logged-in app share one look: the light,
// product-first palette defined on :root in globals.css. Every component reads
// color through the semantic CSS tokens (bg-surface, text-foreground,
// border-border, ...) rather than hardcoded hex, so there is one place to change it.
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
