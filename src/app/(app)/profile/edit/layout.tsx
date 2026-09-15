import { noindexMetadata } from "@/lib/seo";

// profile/edit/page.tsx is "use client", which can't export `metadata`
// itself — same reason (auth)/layout.tsx exists for /login and /signup.
export const metadata = noindexMetadata;

export default function ProfileEditLayout({ children }: LayoutProps<"/">) {
  return children;
}
