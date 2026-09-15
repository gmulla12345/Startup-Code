import { noindexMetadata } from "@/lib/seo";

// onboarding/page.tsx is "use client", which can't export `metadata`
// itself — same reason (auth)/layout.tsx exists for /login and /signup.
export const metadata = noindexMetadata;

export default function OnboardingLayout({ children }: LayoutProps<"/">) {
  return children;
}
