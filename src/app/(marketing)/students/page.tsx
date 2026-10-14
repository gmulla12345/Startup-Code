import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/content/page-seo";
import { canonical } from "@/lib/seo";
import { WebPageJsonLd } from "@/components/shared/webpage-jsonld";
import { StudentsSignup } from "@/components/students/students-signup";
import { StudentsPreview } from "@/components/students/preview";
import { getActiveCampuses } from "@/lib/repositories/campuses";

const SEO = PAGE_SEO.students;

// The canonical URL ignores ?src= and ?code=, so every campaign link
// (/students?code=LOYOLA-BUSINESSCLUB&src=poster-library) is one page to search
// engines, and a tagged link never splits its ranking.
export const metadata: Metadata = {
  title: { absolute: SEO.title },
  description: SEO.description,
  ...canonical(SEO.path),
};

// Static, and refreshed hourly so a school added in the database appears without
// a deploy. Nothing on this page reads the request: the promo-code prefill and the
// page-view event both happen in the browser after load (see StudentsSignup), which
// is what keeps the page fast, cacheable and indexable.
export const revalidate = 3600;

export default async function StudentsPage() {
  const campuses = await getActiveCampuses();

  return (
    <div>
      <WebPageJsonLd path={SEO.path} name={SEO.title} description={SEO.description} dateModified={SEO.lastModified} />

      <section>
        <div className="mx-auto max-w-5xl px-4 pb-14 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-16">
            <div className="lg:pt-6">
              <h1 className="font-logo text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
                Know where to go.
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-foreground-muted">
                A short list of places and plans near your campus, chosen with care.
              </p>
            </div>

            <StudentsSignup campuses={campuses} />
          </div>
        </div>
      </section>

      <StudentsPreview />
    </div>
  );
}
