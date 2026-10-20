import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canonical, organizationRef, safeJsonLd } from "@/lib/seo";
import { brand } from "@/lib/config/brand";
import { BreadcrumbJsonLd } from "@/components/shared/breadcrumb-jsonld";
import { BLOG_POSTS, getBlogPost } from "@/lib/content/blog-posts";
import { articleAuthorJsonLd, getAuthor } from "@/lib/content/authors";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Post not found" };
  return {
    // `seoTitle` keeps the rendered title (with the layout's " · Zolo"
    // suffix) within 60 characters; the page's own H1 still uses `title`.
    title: post.seoTitle ?? post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
      ...(post.updatedAt ? { modifiedTime: post.updatedAt } : {}),
      images: [post.heroImage?.src ?? "/og-image.png"],
    },
    ...canonical(`/blog/${slug}`),
  };
}

// Light inline markup: `[label](/path)` becomes a real internal link and
// `[label](https://...)` an external one (a cited source). Content stays plain
// strings in blog-posts.ts (content-as-data) rather than storing JSX there.
const LINK_PATTERN = /\[([^\]]+)\]\(((?:\/|https?:\/\/)[^)\s]+)\)/g;

function renderWithLinks(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  LINK_PATTERN.lastIndex = 0;
  while ((match = LINK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const href = match[2];
    nodes.push(
      href.startsWith("/") ? (
        <Link key={key++} href={href} className="text-primary hover:underline">
          {match[1]}
        </Link>
      ) : (
        <a key={key++} href={href} rel="noopener noreferrer" target="_blank" className="text-primary hover:underline">
          {match[1]}
        </a>
      )
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

  const author = getAuthor(post.authorSlug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    // The post's real last-edit date, not a copy of the publish date -- the
    // sitemap's lastmod reads the same field.
    dateModified: post.updatedAt ?? post.publishedAt,
    ...(post.heroImage ? { image: post.heroImage.src } : {}),
    // A named Person (with an on-site author page and sameAs profiles) once
    // one is configured in authors.ts; the organization until then.
    author: articleAuthorJsonLd(post.authorSlug),
    publisher: { ...organizationRef(), logo: { "@type": "ImageObject", url: `${brand.domain}/icon.png` } },
    mainEntityOfPage: `${brand.domain}/blog/${slug}`,
    ...(post.sources && post.sources.length > 0
      ? { citation: post.sources.map((s) => ({ "@type": "CreativeWork", name: s.label, url: s.url })) }
      : {}),
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />}
      <BreadcrumbJsonLd items={[{ name: "Blog", path: "/blog" }, { name: post.title, path: `/blog/${slug}` }]} />

      <p className="text-xs text-foreground-subtle mb-3">
        {author && (
          <>
            <Link href={`/author/${author.slug}`} className="text-primary hover:underline">
              By {author.name}
            </Link>{" "}
            ·{" "}
          </>
        )}
        {format(new Date(`${post.publishedAt}T12:00:00`), "MMMM d, yyyy")} · {post.readingMinutes} min read
        {post.updatedAt && <> · Updated {format(new Date(`${post.updatedAt}T12:00:00`), "MMMM d, yyyy")}</>}
      </p>
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground leading-tight mb-6">{post.title}</h1>

      {post.heroImage && (
        <div className="relative aspect-[16/9] w-full rounded-[var(--radius-lg)] overflow-hidden mb-8">
          <Image
            src={post.heroImage.src}
            alt={post.heroImage.alt}
            width={1600}
            height={900}
            priority
            className="absolute inset-0 h-full w-full object-cover"
          />
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
                  <li key={k}>{renderWithLinks(item)}</li>
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

      {post.sources && post.sources.length > 0 && (
        <section className="mt-12 pt-8 border-t border-border" aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="font-display text-xl font-semibold text-foreground mb-4">
            Sources
          </h2>
          <ol className="list-decimal list-outside pl-5 space-y-3 text-sm text-foreground-muted leading-relaxed">
            {post.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} rel="noopener noreferrer" target="_blank" className="text-primary hover:underline">
                  {source.label}
                </a>
                <span> — {source.note}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

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
