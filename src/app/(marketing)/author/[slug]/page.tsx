import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { brand } from "@/lib/config/brand";
import { canonical, safeJsonLd } from "@/lib/seo";
import { AUTHORS, authorUrl, getAuthor, personJsonLd } from "@/lib/content/authors";
import { BLOG_POSTS } from "@/lib/content/blog-posts";
import { BreadcrumbJsonLd } from "@/components/shared/breadcrumb-jsonld";

// Renders nothing until an author is configured in lib/content/authors.ts --
// see the comment there for why that list is empty today.
type AuthorPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return AUTHORS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) return { title: "Author", robots: { index: false, follow: false } };
  const description = `${author.name} is ${author.jobTitle} at ${brand.name}. Read their bio and every article they have written for the ${brand.name} blog.`;
  return {
    title: `${author.name}, ${author.jobTitle}`,
    description,
    openGraph: { title: `${author.name}, ${author.jobTitle}`, description, type: "profile" },
    ...canonical(`/author/${slug}`),
  };
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) notFound();

  const posts = BLOG_POSTS.filter((p) => p.authorSlug === author.slug).sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : -1
  );

  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: authorUrl(author),
    mainEntity: personJsonLd(author),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(profileJsonLd) }} />
      <BreadcrumbJsonLd items={[{ name: author.name, path: `/author/${author.slug}` }]} />

      <p className="text-sm font-medium text-ember mb-3">{author.jobTitle}</p>
      <h1 className="font-display text-4xl sm:text-5xl font-semibold text-foreground tracking-tight mb-6">
        {author.name}
      </h1>

      <div className="space-y-4 text-foreground-muted leading-relaxed">
        {author.bio.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {author.experience && author.experience.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">Experience</h2>
          <ul className="list-disc list-outside pl-5 space-y-2 text-foreground-muted">
            {author.experience.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {author.sameAs.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">Elsewhere</h2>
          <ul className="space-y-2">
            {author.sameAs.map((url) => (
              <li key={url}>
                <a href={url} rel="me noopener noreferrer" target="_blank" className="text-ember hover:underline break-all">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {posts.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">Articles by {author.name}</h2>
          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="text-ember hover:underline font-medium">
                  {post.title}
                </Link>
                <span className="text-sm text-foreground-subtle">
                  {" "}
                  · {format(new Date(`${post.publishedAt}T12:00:00`), "MMMM d, yyyy")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
