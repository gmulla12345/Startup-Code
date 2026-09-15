import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
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
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
      images: [post.heroImage?.src ?? "/og-image.png"],
    },
    ...canonical(`/blog/${slug}`),
  };
}

// Light inline markup: `[label](/path)` becomes a real internal link.
// Content stays plain strings in blog-posts.ts (content-as-data) rather
// than storing JSX there.
const LINK_PATTERN = /\[([^\]]+)\]\((\/[^)]+)\)/g;

function renderWithLinks(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  LINK_PATTERN.lastIndex = 0;
  while ((match = LINK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push(
      <Link key={key++} href={match[2]} className="text-ember hover:underline">
        {match[1]}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
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
    ...(post.heroImage ? { image: post.heroImage.src } : {}),
    author: { "@type": "Organization", name: brand.name },
    publisher: { "@type": "Organization", name: brand.name, logo: { "@type": "ImageObject", url: `${brand.domain}/icon.png` } },
    mainEntityOfPage: `${brand.domain}/blog/${slug}`,
  };

  const faqJsonLd = post.faq
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      }
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <BreadcrumbJsonLd items={[{ name: "Blog", path: "/blog" }, { name: post.title, path: `/blog/${slug}` }]} />

      <p className="text-xs text-foreground-subtle mb-3">
        {format(new Date(`${post.publishedAt}T12:00:00`), "MMMM d, yyyy")} · {post.readingMinutes} min read
      </p>
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground leading-tight mb-6">{post.title}</h1>

      {post.heroImage && (
        <div className="relative aspect-[16/9] w-full rounded-[var(--radius-lg)] overflow-hidden mb-8">
          <Image src={post.heroImage.src} alt={post.heroImage.alt} fill priority className="object-cover" />
        </div>
      )}

      <div className="space-y-8 text-foreground-muted leading-relaxed">
        {post.sections.map((section, i) => (
          <div key={i}>
            {section.heading && (
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">{section.heading}</h2>
            )}
            {section.paragraphs.map((p, j) => (
              <p key={j} className="mb-4">
                {renderWithLinks(p)}
              </p>
            ))}
            {section.list && (
              <ul className="list-disc list-outside pl-5 space-y-2">
                {section.list.map((item, k) => (
                  <li key={k}>{item}</li>
                ))}
              </ul>
            )}
            {section.table && (
              <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-sunken">
                      {section.table.headers.map((h, hi) => (
                        <th key={hi} className="text-left font-medium text-foreground-muted px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, ri) => (
                      <tr key={ri} className="border-b border-border last:border-0 bg-surface">
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className={ci === 0 ? "px-4 py-3 font-medium text-foreground" : "px-4 py-3 text-foreground-muted"}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {post.faq && (
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">Questions</h2>
          <div className="space-y-3">
            {post.faq.map((item) => (
              <div key={item.q} className="rounded-[var(--radius-md)] border border-border bg-surface px-5 py-4">
                <h3 className="font-medium text-foreground mb-1.5">{item.q}</h3>
                <p className="text-sm text-foreground-muted leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
