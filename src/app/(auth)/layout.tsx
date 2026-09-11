import type { Metadata } from "next";

// /login, /signup, and /reset-password are thin, app-only utility pages
// with no unique content worth ranking — indexing them just competes with
// discoverzolo.com's own homepage/marketing pages in search results.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return children;
}
