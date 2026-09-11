import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/config/brand";
import { canonical } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/shared/breadcrumb-jsonld";
import { BLOG_POSTS, getBlogPost } from "@/lib/content/blog-posts";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.description,
    openGraph: { title: post.title, description: post.description, type: "article", publishedTime: post.publishedAt },
    ...canonical(`/blog/${slug}`),
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { "@type": "Organization", name: brand.name },
    publisher: { "@type": "Organization", name: brand.name, logo: { "@type": "ImageObject", url: `${brand.domain}/icon.png` } },
    mainEntityOfPage: `${brand.domain}/blog/${slug}`,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BreadcrumbJsonLd items={[{ name: "Blog", path: "/blog" }, { name: post.title, path: `/blog/${slug}` }]} />

      <p className="text-xs text-foreground-subtle mb-3">
        {format(new Date(`${post.publishedAt}T12:00:00`), "MMMM d, yyyy")} · {post.readingMinutes} min read
      </p>
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground leading-tight mb-8">{post.title}</h1>

      <div className="space-y-8 text-foreground-muted leading-relaxed">
        {post.sections.map((section, i) => (
          <div key={i}>
            {section.heading && (
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">{section.heading}</h2>
            )}
            {section.paragraphs.map((p, j) => (
              <p key={j} className="mb-4">
                {p}
              </p>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-border text-center">
        <Button asChild size="lg">
          <Link href="/signup">
            Start Discovering <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
