import { brand } from "@/lib/config/brand";

export interface BlogSection {
  heading?: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  /** Used as the meta description and the card/list-page summary. */
  description: string;
  /** ISO date (YYYY-MM-DD). */
  publishedAt: string;
  readingMinutes: number;
  sections: BlogSection[];
}

// Content-as-data, same pattern as vs-pages.ts, so posts can be added
// without wiring up a markdown/MDX pipeline. Keep new posts factual and
// general — no fabricated venue-specific claims (hours, prices, "best of"
// rankings for real places) that could go stale or turn out wrong; that
// kind of content should be reviewed by a real person, or generated from
// live data, before it's published under the Zolo name (see the "never
// fabricate a fact" line on /about).
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-ai-is-changing-the-way-we-discover-things-to-do",
    title: "How AI Is Changing the Way We Discover Things to Do",
    description:
      "Search engines gave us more options than ever. Social feeds gave us envy. Here's how AI-driven personalization is starting to give us an actual plan instead.",
    publishedAt: "2026-09-11",
    readingMinutes: 6,
    sections: [
      {
        paragraphs: [
          "Twenty years ago, figuring out what to do on a Saturday meant asking a friend, checking a local paper, or just going somewhere you already knew. Today it means opening an app and choosing from thousands of options ranked by strangers you've never met. Somewhere in that shift, \"more information\" quietly turned into \"more exhausting.\"",
          "That's the paradox at the center of modern discovery: we have more data about things to do than any generation before us, and it's making the decision harder, not easier. AI-driven personalization is the first real attempt to fix that — not by adding another feed to scroll, but by narrowing the world down to what actually fits you.",
        ],
      },
      {
        heading: "From directories, to search, to feeds",
        paragraphs: [
          "Discovery has moved through a few distinct eras. First came directories — phone books, local guides, word of mouth. Then search engines, which indexed the entire web and let you ask a specific question, but left the ranking and filtering to you. Then review aggregators and social feeds, which added a popularity signal (star ratings, likes) on top of search, but optimized for engagement and consensus rather than fit.",
          "Each step added more raw material. None of them actually answered the question people are asking, which isn't \"what exists near me\" — it's \"what should I, specifically, do.\"",
        ],
      },
      {
        heading: "What \"personalized\" actually means",
        paragraphs: [
          "The term gets used loosely, so it's worth being specific. A genuinely personalized recommendation engine combines a few distinct layers: structured filtering (your location, your budget, your stated interests), a scoring model that ranks candidates against your profile and past behavior, and — increasingly — a reasoning layer that can explain, in plain language, why a specific pick was chosen for you.",
          "That last part matters more than it sounds. A ranked list without reasoning is still a black box; you're trusting the algorithm without understanding it. A recommendation that comes with \"because you tend to pick highly-rated, lower-crowd spots on weekends, and this one's ten minutes from you\" is something you can actually evaluate and push back on — dismiss it, and a good system should learn from that immediately, not just log it and move on.",
        ],
      },
      {
        heading: "Where this still needs a human",
        paragraphs: [
          "It's worth being honest about the limits here too. AI recommendation engines are good at narrowing a huge field down to a short, relevant list based on patterns — interests, budget, location, past behavior. They are not a substitute for checking real-time details before you actually go: hours change, venues close, availability shifts. A system that fabricates confidence about live details it doesn't actually have is worse than one that says \"we don't know, verify before you go.\"",
          "The honest version of this technology narrows the field and explains its reasoning — it doesn't pretend to know things it can't.",
        ],
      },
      {
        heading: "Where personalized discovery is headed",
        paragraphs: [
          `The next step isn't more data — it's better use of the data you already generate just by living your life. Every place you save, skip, or actually go to is a signal. The systems that get this right treat every interaction as an update, not just a click to log, so week two's recommendations are measurably sharper than week one's, and a trip itinerary can be edited conversationally instead of regenerated from scratch. That's the direction ${brand.name} is built around: structured filtering and scoring doing the heavy lifting, AI reasoning explaining the "why," and the whole system getting sharper with actual use — not a longer list, a better one.`,
        ],
      },
    ],
  },
  {
    slug: "tripadvisor-vs-google-maps-vs-zolo",
    title: "Tripadvisor vs Google Maps vs Zolo: Which Is Best for Finding Things to Do?",
    description:
      "Three different tools solve three different problems. Here's when each one actually makes sense, and why they're not really competing with each other.",
    publishedAt: "2026-09-11",
    readingMinutes: 7,
    sections: [
      {
        paragraphs: [
          "\"What's the best app for finding things to do?\" is a bit like asking \"what's the best tool in the toolbox?\" — it depends entirely on what you're trying to build. Google Maps, Tripadvisor, and Zolo all touch the same broad space, but they're solving genuinely different problems. Understanding which is which will save you a lot of aimless scrolling.",
        ],
      },
      {
        heading: "Google Maps: the map of everything",
        paragraphs: [
          "Google Maps' strength is comprehensiveness. It has more places, more reviews, and more real-time data (hours, busy times, live directions) than almost anything else on the internet. If you already know what you're looking for — \"coffee near me,\" \"the address of this restaurant,\" \"is this place open right now\" — nothing beats it.",
          "Its weakness is the flip side of the same strength: it's a map of literally everything, with no sense of who's looking. Search \"things to do near me\" and you get the same ranked list everyone else gets, sorted mostly by popularity and proximity, with no idea whether you're into quiet museums or loud bars. It answers \"what's there,\" not \"what fits me.\"",
        ],
      },
      {
        heading: "Tripadvisor: the traveler's consensus",
        paragraphs: [
          "Tripadvisor is built for a specific moment: you're traveling somewhere unfamiliar and want a second opinion from people who've already been there. Its review depth and \"Top 10 things to do in [city]\" lists are genuinely useful for orienting yourself in a new place fast.",
          "The tradeoff is that it optimizes for consensus, which tends to concentrate attention on the same handful of famous attractions in every city — the ones already crowded with other tourists reading the same list. It's also built around trips, not your regular weekend at home, and like Google Maps, it isn't personalizing to your specific interests or budget — everyone sees roughly the same \"best of\" ranking.",
        ],
      },
      {
        heading: `Zolo: personalization, not just more listings`,
        paragraphs: [
          `${brand.name} isn't trying to out-list Google Maps or out-review Tripadvisor — it starts from a different question: given everything that exists nearby, what's actually worth doing for this specific person, right now? It combines your stated interests, budget, and personality with a scoring model and AI reasoning that explains each pick, so you get a short list instead of an overwhelming one, plus surfacing genuine hidden gems that a pure popularity ranking would bury.`,
          "It's also honest about where it can't help: for real-time specifics like exact hours or live availability, or for deep destination research while traveling, Google Maps and Tripadvisor are still the right tool — which is exactly why every recommendation links out to real booking or map data rather than trying to fake it.",
        ],
      },
      {
        heading: "Using them together",
        paragraphs: [
          "In practice these tools aren't mutually exclusive. A reasonable flow: use Zolo when you don't know what you want yet and want a short, personalized list with a reason attached. Use Google Maps once you've picked something, to check hours and get directions. Use Tripadvisor when you're deep in trip-planning mode and want traveler consensus on the big, famous must-sees in a new city.",
          "Different jobs, different tools. The mistake is expecting a general-purpose map or a traveler review site to do the one thing neither was built for: understanding you specifically.",
        ],
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
