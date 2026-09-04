import { pricing } from "@/lib/config/pricing";
import type { FaqItem } from "@/components/marketing/faq-accordion";

export interface VsComparisonRow {
  feature: string;
  zolo: string | boolean;
  competitor: string | boolean;
}

export interface VsPage {
  slug: string;
  competitor: string;
  /** Short positioning line, e.g. "personalized reasoning vs review aggregation". */
  tagline: string;
  intro: string;
  comparison: VsComparisonRow[];
  whySwitch: { title: string; body: string }[];
  faq: FaqItem[];
}

/**
 * Content for the /vs/[slug] comparison pages. Kept qualitative and
 * non-disparaging — no invented stats about a competitor (review counts,
 * pricing we haven't verified, etc.), only well-known, defensible
 * differences in what each product actually does.
 */
export const VS_PAGES: VsPage[] = [
  {
    slug: "zolo-vs-tripadvisor",
    competitor: "Tripadvisor",
    tagline: "Personalized reasoning vs. review aggregation",
    intro:
      "Tripadvisor is a review aggregator — it shows you what's popular. Zolo is a personalized discovery engine — it shows you what fits your interests, budget, and personality, and tells you why.",
    comparison: [
      { feature: "How picks are chosen", zolo: "Matched to your interests, budget & personality", competitor: "Ranked by review volume & rating" },
      { feature: "Reason given for each pick", zolo: true, competitor: false },
      { feature: "Learns from what you save or skip", zolo: true, competitor: false },
      { feature: "AI trip & weekend planning", zolo: true, competitor: false },
      { feature: "\"Surprise Me\" spontaneous picks", zolo: true, competitor: false },
      { feature: "User reviews & ratings", zolo: false, competitor: true },
      { feature: "Free tier", zolo: true, competitor: true },
      { feature: "Premium plan", zolo: `$${pricing.premium.priceMonthly}/mo`, competitor: "Free" },
    ],
    whySwitch: [
      {
        title: "You stop scrolling through review threads",
        body: "Tripadvisor hands you a wall of reviews and lets you decide. Zolo hands you a short list already matched to what you actually like, with a plain-English reason for every pick.",
      },
      {
        title: "It gets better the more you use it",
        body: "Every save and skip teaches Zolo what you're into. Tripadvisor's rankings are the same for everyone looking at a given place.",
      },
      {
        title: "You get a plan, not just a list",
        body: "The AI Weekend Planner and Trip Planner build a real day-by-day itinerary from your picks — Tripadvisor doesn't plan your day for you.",
      },
    ],
    faq: [
      {
        q: "Is Zolo trying to replace Tripadvisor?",
        a: "No — they solve different problems. Tripadvisor is great for checking reviews on a specific place you already know about. Zolo is for when you don't know what you want to do yet and want a short, personalized list instead of thousands of results to sort through.",
      },
      {
        q: "Does Zolo have user reviews like Tripadvisor?",
        a: "Not yet — Zolo's ratings come from the real places data it's built on (like Google's ratings), not an in-app review system. Reviews may come later; for now Zolo's differentiator is personalized matching and reasoning, not review volume.",
      },
      {
        q: "Is Zolo free like Tripadvisor?",
        a: `Zolo has a free tier (personalized picks, unlimited saves, one Surprise Me a week). Unlimited discovery, AI planning, and exclusive experiences are part of Premium ($${pricing.premium.priceMonthly}/month).`,
      },
    ],
  },
  {
    slug: "zolo-vs-atlas-obscura",
    competitor: "Atlas Obscura",
    tagline: "Personalization + a learning loop vs. editorial curation",
    intro:
      "Atlas Obscura curates hidden gems through its editorial team — the same list for every reader. Zolo curates hidden gems and mainstream picks alike, matched specifically to you, and adjusts as it learns what you respond to.",
    comparison: [
      { feature: "How picks are chosen", zolo: "Matched to your interests, budget & personality", competitor: "Editorially curated, same for every reader" },
      { feature: "Hidden gems", zolo: true, competitor: true },
      { feature: "Mainstream picks alongside hidden gems", zolo: true, competitor: false },
      { feature: "Personalized to you specifically", zolo: true, competitor: false },
      { feature: "Learns from what you save or skip", zolo: true, competitor: false },
      { feature: "AI trip & weekend planning", zolo: true, competitor: false },
      { feature: "Long-form editorial writeups", zolo: false, competitor: true },
      { feature: "Free tier", zolo: true, competitor: true },
    ],
    whySwitch: [
      {
        title: "The list is built for you, not for everyone",
        body: "Atlas Obscura's picks are the same for every visitor. Zolo's picks change based on your budget, interests, and what you've saved or skipped before.",
      },
      {
        title: "You still get the hidden gems",
        body: "Zolo surfaces real hidden gems the same way — using signals like a strong rating with lower review volume — it just weighs them against what fits you, instead of a fixed editorial pick.",
      },
      {
        title: "Discovery doesn't stop at reading",
        body: "Save a pick and Zolo can build it into an actual weekend or trip plan. Atlas Obscura's entries are articles to read, not itineraries to follow.",
      },
    ],
    faq: [
      {
        q: "Does Zolo have the same offbeat, unusual places as Atlas Obscura?",
        a: "Zolo surfaces hidden gems using real signals from its places data (like a strong rating with a smaller review count), not hand-written editorial entries. The tone is different — Atlas Obscura specializes in long-form storytelling about unusual places; Zolo specializes in matching a short list of places, ordinary or unusual, to you specifically.",
      },
      {
        q: "Can I read long articles about places on Zolo?",
        a: "Not currently — Zolo shows a short reason for each pick rather than a full editorial writeup. If you want Atlas Obscura's style of long-form storytelling, that's still their strength.",
      },
      {
        q: "Is Zolo free like Atlas Obscura?",
        a: `Yes, Zolo has a free tier. Unlimited discovery, AI trip planning, and exclusive experiences are part of Premium ($${pricing.premium.priceMonthly}/month).`,
      },
    ],
  },
  {
    slug: "zolo-vs-google-maps",
    competitor: "Google Maps",
    tagline: "A curated short list vs. 10,000 results",
    intro:
      "Search \"things to do near me\" on Google Maps and you get thousands of pins with no idea where to start. Zolo gives you a short list — usually a handful of picks — already matched to your interests and budget, with a reason for each one.",
    comparison: [
      { feature: "Results for a search", zolo: "A short, curated list", competitor: "Thousands of pins" },
      { feature: "Personalized to your interests & budget", zolo: true, competitor: false },
      { feature: "Reason given for each pick", zolo: true, competitor: false },
      { feature: "\"Surprise Me\" spontaneous picks", zolo: true, competitor: false },
      { feature: "AI trip & weekend planning", zolo: true, competitor: false },
      { feature: "Turn-by-turn navigation", zolo: false, competitor: true },
      { feature: "Business hours, directions, reviews", zolo: false, competitor: true },
      { feature: "Free tier", zolo: true, competitor: true },
    ],
    whySwitch: [
      {
        title: "You skip the decision fatigue",
        body: "Google Maps is comprehensive by design — every business, every pin. That's exactly the problem when you don't know what you want yet. Zolo narrows it down for you first.",
      },
      {
        title: "Every pick comes with a reason",
        body: "Google Maps shows ratings and distance. Zolo tells you why a specific place fits you — your budget, your interests, your personality — before you tap it.",
      },
      {
        title: "It's a starting point, not a replacement",
        body: "Once you've picked something on Zolo, you'll still want real directions — that's what Google Maps is for. Zolo solves \"what should I do,\" not \"how do I get there.\"",
      },
    ],
    faq: [
      {
        q: "Is Zolo trying to replace Google Maps?",
        a: "No. Zolo solves a different problem — deciding what to do, not how to get there. Once you've picked an experience on Zolo, you'll likely still open Maps for directions.",
      },
      {
        q: "Does Zolo have as many places as Google Maps?",
        a: "No single product does. Zolo's real places data is powered by the same underlying places data Google Maps draws from, but Zolo deliberately shows you a short, matched list instead of every result — that curation is the point.",
      },
      {
        q: "Is Zolo free like Google Maps?",
        a: `Zolo has a free tier (personalized picks, unlimited saves, one Surprise Me a week). Unlimited discovery, AI planning, and exclusive experiences are part of Premium ($${pricing.premium.priceMonthly}/month).`,
      },
    ],
  },
];

export function getVsPage(slug: string): VsPage | undefined {
  return VS_PAGES.find((p) => p.slug === slug);
}
