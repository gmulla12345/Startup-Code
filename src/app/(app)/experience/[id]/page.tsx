import { notFound } from "next/navigation";
import { Clock, MapPin, Sparkles, Star, Users } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getExperienceProvider } from "@/services/providers";
import { getReviewsForExperience } from "@/lib/repositories/reviews";
import { getSubscription, isPremium } from "@/lib/repositories/subscriptions";
import { ExperienceGallery } from "@/components/experience/experience-gallery";
import { MiniMap } from "@/components/experience/mini-map";
import { ActionBar } from "@/components/experience/action-bar";
import { PremiumLock } from "@/components/experience/premium-lock";
import { ReviewsList } from "@/components/experience/reviews-list";
import { ExperienceCard } from "@/components/experience/experience-card";
import { Badge } from "@/components/ui/badge";
import { formatCategoryLabel, formatDuration, formatPrice } from "@/lib/utils/format";
import { trackEvent } from "@/lib/repositories/events";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { scoreExperience } from "@/services/recommendation/scoring";
import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/experience/[id]">): Promise<Metadata> {
  const { id } = await params;
  const provider = await getExperienceProvider();
  const experience = (await provider.getBySlug(id)) ?? (await provider.getById(id));
  if (!experience) return { title: "Experience not found" };

  return {
    title: experience.title,
    description: experience.shortDescription,
    openGraph: {
      title: experience.title,
      description: experience.shortDescription,
      images: experience.images.slice(0, 1),
    },
  };
}

export default async function ExperienceDetailPage({ params }: PageProps<"/experience/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const provider = await getExperienceProvider();
  const experience = (await provider.getBySlug(id)) ?? (await provider.getById(id));
  if (!experience) notFound();

  const [reviews, related] = await Promise.all([
    getReviewsForExperience(supabase, experience.id),
    provider.getRelated(experience.id, 4),
  ]);

  let initialSaved = false;
  let userIsPremium = false;
  let match: { score: number; reasons: string[] } | null = null;

  if (user) {
    await trackEvent(supabase, user.id, "viewed_experience", experience.id, { source: "detail_page" });
    const [{ data: savedRow }, subscription, profile] = await Promise.all([
      supabase.from("saved_experiences").select("id").eq("user_id", user.id).eq("experience_id", experience.id).maybeSingle(),
      getSubscription(supabase, user.id),
      getProfileByUserId(supabase, user.id),
    ]);
    initialSaved = Boolean(savedRow);
    userIsPremium = isPremium(subscription);

    if (profile?.onboardingCompleted) {
      const scored = scoreExperience(experience, profile);
      match = { score: scored.score, reasons: scored.reasons };
    }
  }

  const locked = experience.isPremium && !userIsPremium;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: experience.title,
    description: experience.shortDescription,
    image: experience.images,
    address: {
      "@type": "PostalAddress",
      addressLocality: experience.city,
      addressRegion: experience.region ?? undefined,
      addressCountry: experience.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: experience.latitude, longitude: experience.longitude },
    ...(experience.rating
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: experience.rating, reviewCount: experience.reviewCount } }
      : {}),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {locked ? (
        <PremiumLock title={experience.title} image={experience.images[0]} />
      ) : (
        <ExperienceGallery images={experience.images} title={experience.title} />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge variant="default">{formatCategoryLabel(experience.category)}</Badge>
        {experience.isHiddenGem && <Badge variant="gold">Hidden gem</Badge>}
        {experience.isPremium && <Badge variant="ember">Premium</Badge>}
        {experience.sourceProvider === "mock" && <Badge variant="outline">Editorial pick</Badge>}
      </div>
      {experience.sourceProvider === "mock" && (
        <p className="text-xs text-foreground-subtle mt-2">
          Curated by our team as an example of the kind of experience {`we'd`} recommend — always confirm details
          directly with the venue before you go.
        </p>
      )}

      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mt-3">{experience.title}</h1>

      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-foreground-muted">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-4 w-4" /> {experience.city}
          {experience.region ? `, ${experience.region}` : ""}
        </span>
        {experience.rating && (
          <span className="inline-flex items-center gap-1">
            <Star className="h-4 w-4 fill-[var(--gold)] text-[var(--gold)]" /> {experience.rating.toFixed(1)} ({experience.reviewCount})
          </span>
        )}
        {experience.durationMinutes && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" /> {formatDuration(experience.durationMinutes)}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Users className="h-4 w-4" /> {experience.socialMode === "either" ? "Solo or group" : experience.socialMode}
        </span>
        <span className="font-semibold text-foreground">{formatPrice(experience.priceEstimate, experience.priceLevel)}</span>
      </div>

      <div className="mt-6">
        <ActionBar
          experienceId={experience.id}
          slug={experience.slug}
          title={experience.title}
          shortDescription={experience.shortDescription}
          tags={experience.tags}
          category={experience.category}
          isAuthenticated={Boolean(user)}
          initialSaved={initialSaved}
          externalBookingUrl={locked ? null : experience.externalBookingUrl}
        />
      </div>

      {match && (
        <div className="mt-6 rounded-[var(--radius-lg)] border border-border bg-[var(--ember-soft)]/40 p-4 flex gap-3">
          <div className="h-9 w-9 rounded-full bg-[var(--ember-soft)] flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-ember" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{match.score}% match for you</p>
            <p className="text-sm text-foreground-muted mt-0.5">{match.reasons.join(". ")}.</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8 mt-10">
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">About</h2>
            <p className="text-foreground-muted leading-relaxed whitespace-pre-line">{experience.description}</p>
          </section>

          {experience.requirements.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">Good to know</h2>
              <ul className="list-disc list-inside text-sm text-foreground-muted space-y-1">
                {experience.requirements.map((req) => (
                  <li key={req}>{req}</li>
                ))}
              </ul>
              {experience.availability && (
                <p className="text-sm text-foreground-muted mt-2">
                  <strong className="text-foreground">Availability:</strong> {experience.availability}
                </p>
              )}
            </section>
          )}

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">Reviews</h2>
            <ReviewsList reviews={reviews} />
          </section>
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Location</h2>
          <MiniMap latitude={experience.latitude} longitude={experience.longitude} label={experience.title} />
          {experience.address && <p className="text-sm text-foreground-muted">{experience.address}</p>}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">You might also like</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {related.map((exp) => (
              <ExperienceCard key={exp.id} experience={exp} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
