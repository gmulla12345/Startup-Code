import type { MetadataRoute } from "next";
import { brand } from "@/lib/config/brand";
import { getExperienceProvider, getTravelProvider } from "@/services/providers";
import { VS_PAGES } from "@/lib/content/vs-pages";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const provider = await getExperienceProvider();
  const [experiences, destinations] = await Promise.all([
    provider.list({ limit: 200 }),
    getTravelProvider().listDestinations(),
  ]);

  return [
    { url: brand.domain, changeFrequency: "weekly", priority: 1 },
    { url: `${brand.domain}/pricing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${brand.domain}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${brand.domain}/signup`, changeFrequency: "monthly", priority: 0.5 },
    ...VS_PAGES.map((p) => ({
      url: `${brand.domain}/vs/${p.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...experiences.map((e) => ({
      url: `${brand.domain}/experience/${e.slug}`,
      lastModified: e.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...destinations.map((d) => ({
      url: `${brand.domain}/travel/${d.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
