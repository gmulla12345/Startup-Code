import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { brand } from "@/lib/config/brand";
import { canonical } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/content/page-seo";
import { BreadcrumbJsonLd } from "@/components/shared/breadcrumb-jsonld";
import { WebPageJsonLd } from "@/components/shared/webpage-jsonld";
import { BLOG_POSTS } from "@/lib/content/blog-posts";

const SEO = PAGE_SEO.blog;

export const metadata: Metadata = {
  title: { absolute: SEO.title },
  description: SEO.description,
  ...canonical(SEO.path),
};

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
      <WebPageJsonLd
        type="CollectionPage"
        path={SEO.path}
        name={SEO.title}
        description={SEO.description}
        dateModified={SEO.lastModified}
        mainEntity={{
          "@type": "Blog",
          name: `${brand.name} Blog`,
          url: `${brand.domain}${SEO.path}`,
          blogPost: posts.map((post) => ({
            "@type": "BlogPosting",
            headline: post.title,
            url: `${brand.domain}/blog/${post.slug}`,
            datePublished: post.publishedAt,
          })),
        }}
      />
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
            className="flex gap-5 rounded-[var(--radius-lg)] border border-border bg-surface p-6 hover:border-border-strong transition-colors"
          >
            {post.heroImage && (
              <div className="relative hidden sm:block w-32 h-24 shrink-0 rounded-[var(--radius-md)] overflow-hidden">
                <Image
                  src={post.heroImage.src}
                  alt={post.heroImage.alt}
                  width={256}
                  height={192}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            )}
            <div>
              <p className="text-xs text-foreground-subtle mb-2">
                {format(new Date(`${post.publishedAt}T12:00:00`), "MMMM d, yyyy")} · {post.readingMinutes} min read
              </p>
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">{post.title}</h2>
              <p className="text-sm text-foreground-muted leading-relaxed">{post.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
