import { brand } from "@/lib/config/brand";

/**
 * llms.txt (llmstxt.org convention) — a plain-text map of the site for AI
 * assistants (ChatGPT search, Perplexity, Claude, etc.) to understand what
 * the product is and which pages to cite, without having to crawl and
 * interpret the full HTML. Built from the same brand config every other
 * page uses, not hand-duplicated text, so it can't drift out of sync.
 *
 * No "well-known file" convention for this exists in Next.js (unlike
 * robots.txt/sitemap.xml, which have dedicated file conventions — see
 * src/app/robots.ts and src/app/sitemap.ts) so this is a plain Route
 * Handler on a literal "llms.txt" segment instead.
 */
export async function GET() {
  const body = `# ${brand.name}

> ${brand.description}

${brand.name} is a personalized discovery engine for real-world experiences — not a search engine or a social feed. Tell it your interests, budget, and personality, and it recommends a short, curated list of things to do, adventures, and hidden gems worth actually doing, each with a reason why it was picked.

## Product

- [Homepage](${brand.domain}/): What ${brand.name} is and how personalized discovery works.
- [About](${brand.domain}/about): Why ${brand.name} exists and the problem it solves.
- [Pricing](${brand.domain}/pricing): Free and Premium ($19.99/month or $190/year) plans, feature comparison, and FAQ.
- [FAQ](${brand.domain}/faq): How recommendations work, booking, cancellation, and coverage.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
