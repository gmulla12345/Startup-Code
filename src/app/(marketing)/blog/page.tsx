import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { brand } from "@/lib/config/brand";
import { canonical } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/shared/breadcrumb-jsonld";
import { BLOG_POSTS } from "@/lib/content/blog-posts";

export const metadata: Metadata = {
  title: "Blog",
  description: `Guides, comparisons, and ideas on personalized discovery, travel, and finding things to do — from the team behind ${brand.name}.`,
  ...canonical("/blog"),
};

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
      <BreadcrumbJsonLd items={[{ name: "Blog", path: "/blog" }]} />
      <p className="text-sm font-medium text-ember mb-3">From the team</p>
      <h1 className="font-display text-4xl sm:text-5xl font-semibold text-foreground mb-4">{brand.name} Blog</h1>
      <p className="text-lg text-foreground-muted mb-12 max-w-xl">
        Guides, comparisons, and ideas on personalized discovery, travel, and finding things to do worth actually
        doing.
      </p>

      <div className="space-y-8">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block rounded-[var(--radius-lg)] border border-border bg-surface p-6 hover:border-border-strong transition-colors"
          >
            <p className="text-xs text-foreground-subtle mb-2">
              {format(new Date(`${post.publishedAt}T12:00:00`), "MMMM d, yyyy")} · {post.readingMinutes} min read
            </p>
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">{post.title}</h2>
            <p className="text-sm text-foreground-muted leading-relaxed">{post.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
