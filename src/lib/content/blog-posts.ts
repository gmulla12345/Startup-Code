import { brand } from "@/lib/config/brand";

export interface BlogSection {
  heading?: string;
  /**
   * Supports light inline markup: `[label](/path)` renders as a real
   * internal link and `[label](https://...)` as an external one (parsed in
   * blog/[slug]/page.tsx) — kept as plain strings rather than JSX so this
   * stays content-as-data, same pattern as vs-pages.ts.
   */
  paragraphs: string[];
  /** Optional bullet list rendered after the section's paragraphs. Items take the same inline link markup. */
  list?: string[];
  /** Optional comparison table rendered after the section's paragraphs/list. */
  table?: { headers: string[]; rows: string[][] };
}

export interface BlogFaqItem {
  q: string;
  a: string;
}

/**
 * An independent primary source a post draws on (official documentation, a
 * published study, the platform's own description of how it works) -- not
 * another blog summarising one. Every URL here must resolve and must say
 * what `note` says it does; check both before adding one. Rendered as a
 * "Sources" list at the end of the post and emitted as the article's
 * `citation` in its JSON-LD.
 */
export interface BlogSource {
  label: string;
  url: string;
  /** One line on what the source says that the post relies on. */
  note: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  /**
   * Shorter title used for <title> and search results when `title` is too
   * long for them: the layout appends " · Zolo", so the rendered title stays
   * within 60 characters only if this is 53 or fewer. The page itself still
   * shows `title` as its H1.
   */
  seoTitle?: string;
  /** Used as the meta description (110-160 characters) and the card/list-page summary. */
  description: string;
  /** ISO date (YYYY-MM-DD). */
  publishedAt: string;
  /** ISO date of the last substantive edit; `dateModified` and the sitemap's lastmod. Omit if never edited. */
  updatedAt?: string;
  /** Slug of an entry in AUTHORS (authors.ts). Unset = credited to the organization. */
  authorSlug?: string;
  /** Independent primary sources the post relies on. At least two per post. */
  sources?: BlogSource[];
  readingMinutes: number;
  /** Rendered near the top of the post and used as its social-share image. */
  heroImage?: { src: string; alt: string };
  sections: BlogSection[];
  /** Rendered at the end of the post with FAQPage structured data. */
  faq?: BlogFaqItem[];
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
    publishedAt: "2026-09-05",
    updatedAt: "2026-10-12",
    sources: [
      {
        label:
          "Iyengar & Lepper (2000), \"When Choice Is Demotivating: Can One Desire Too Much of a Good Thing?\", Journal of Personality and Social Psychology",
        url: "https://doi.org/10.1037/0022-3514.79.6.995",
        note: "Three experiments in which people offered 6 options were more likely to act, and more satisfied, than people offered 24 or 30.",
      },
      {
        label: "Tripadvisor, \"Everything You Need to Know About the Tripadvisor Popularity Ranking\"",
        url: "https://www.tripadvisor.com/business/insights/resources/tripadvisor-popularity-ranking",
        note: "Tripadvisor's own description of its popularity ranking: based on the quality, recency, and quantity of reviews, and their consistency over time.",
      },
      {
        label: "Google Business Profile Help, \"Tips to improve your local ranking on Google\"",
        url: "https://support.google.com/business/answer/7091",
        note: "Google's description of what local results are based on: relevance, distance, and popularity.",
      },
    ],
    readingMinutes: 8,
    heroImage: {
      src: "https://images.unsplash.com/photo-1522199755839-a2bacb67c546?auto=format&fit=crop&w=1600&q=80",
      alt: "A laptop showing a photo collage next to a warm drink, evoking browsing for something to do",
    },
    sections: [
      {
        paragraphs: [
          "Twenty years ago, figuring out what to do on a Saturday meant asking a friend, checking a local paper, or just going somewhere you already knew. Today it means opening an app and choosing from thousands of options ranked by strangers you've never met. Somewhere in that shift, \"more information\" quietly turned into \"more exhausting.\"",
          "That's the paradox at the center of modern discovery: we have more data about things to do than any generation before us, and it's making the decision harder, not easier. Researchers have measured the effect: in [a well-known set of choice-overload experiments](https://doi.org/10.1037/0022-3514.79.6.995), people given 6 options were more likely to act, and more satisfied with what they picked, than people given 24 or 30. AI-driven personalization is the first real attempt to fix that — not by adding another feed to scroll, but by narrowing the world down to what actually fits you.",
        ],
      },
      {
        heading: "From directories, to search, to feeds",
        paragraphs: [
          "Discovery has moved through a few distinct eras. First came directories — phone books, local guides, word of mouth. Then search engines, which indexed the entire web and let you ask a specific question, but left the ranking and filtering to you. Then review aggregators and social feeds, which added a popularity signal (star ratings, likes) on top of search, but optimized for engagement and consensus rather than fit. Tripadvisor, for example, says its popularity ranking is [based on the quality, recency, and quantity of reviews](https://www.tripadvisor.com/business/insights/resources/tripadvisor-popularity-ranking), and Google says [local results are mainly based on relevance, distance, and popularity](https://support.google.com/business/answer/7091).",
          "Each step added more raw material. None of them actually answered the question people are asking, which isn't \"what exists near me\" — it's \"what should I, specifically, do.\" See [Tripadvisor vs Google Maps vs Zolo](/blog/tripadvisor-vs-google-maps-vs-zolo) for how those two specific tools fit into this history.",
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
        heading: "How to tell if a recommendation engine is actually personalized",
        paragraphs: [
          "\"Personalized\" gets slapped on a lot of products that aren't, really — a lot of what's marketed as personalization is just popularity ranking with your city plugged in. A few honest questions can tell the difference:",
        ],
        list: [
          "Does it ask about your budget and interests up front, or just your location? Location alone isn't personalization — it's a filter everyone else gets too.",
          "If you dismiss a recommendation, does the next one visibly change, or does the list stay basically the same? A system that doesn't react to feedback isn't learning anything.",
          "Does it explain why it picked something, or just show a star rating? A rating is Google Maps' job. A reason is the personalization layer's job.",
          "Would two different people in the same city, with different stated interests, actually see different results? If everyone sees the same \"top picks,\" it's a popularity list wearing a personalization label.",
        ],
      },
      {
        heading: "Where this still needs a human",
        paragraphs: [
          "It's worth being honest about the limits here too. AI recommendation engines are good at narrowing a huge field down to a short, relevant list based on patterns — interests, budget, location, past behavior. They are not a substitute for checking real-time details before you actually go: hours change, venues close, availability shifts. A system that fabricates confidence about live details it doesn't actually have is worse than one that says \"we don't know, verify before you go.\"",
          "The honest version of this technology narrows the field and explains its reasoning — it doesn't pretend to know things it can't. See our [FAQ](/faq) for more on how we handle the line between what we know for certain and what we don't.",
        ],
      },
      {
        heading: "Where personalized discovery is headed",
        paragraphs: [
          `The next step isn't more data — it's better use of the data you already generate just by living your life. Every place you save, skip, or actually go to is a signal. The systems that get this right treat every interaction as an update, not just a click to log, so recommendations are designed to get sharper the more you use them, and a trip itinerary can be edited conversationally instead of regenerated from scratch. That's the direction ${brand.name} is built around: structured filtering and scoring doing the heavy lifting, AI reasoning explaining the "why," and the whole system getting sharper with actual use — not a longer list, a better one.`,
          "If you want to see the difference between this and a straightforward map or review site, [see how Zolo compares to Google Maps](/vs/zolo-vs-google-maps), or just [create a free account](/signup) and check your first week of recommendations against your second.",
        ],
      },
    ],
    faq: [
      {
        q: "Does AI-based discovery replace using your own judgment?",
        a: "No — it narrows a huge field down to a short, relevant list and explains its reasoning. Verifying live details (hours, availability, whether it's genuinely a fit tonight) is still on you, and any honest recommendation engine will say so rather than pretend to know things it can't.",
      },
      {
        q: "How is this different from a popularity ranking?",
        a: "A popularity ranking (star ratings, review counts) shows the same list to everyone. Genuine personalization factors in your specific budget, interests, and past feedback, so two different people can get two different, equally valid short lists.",
      },
      {
        q: "Can I influence what an AI recommendation engine shows me?",
        a: `Yes, in a well-built one. On ${brand.name}, dismissing a recommendation or tapping "Not for me" adjusts what you see next immediately — the system is meant to react to feedback, not just log it.`,
      },
      {
        q: "Is this the same thing as a chatbot?",
        a: "No. A chatbot answers questions you type. A recommendation engine like this proactively narrows real options down to a short list based on your profile — you can still ask it things conversationally (like editing a trip plan by chatting), but the core job is filtering and ranking, not conversation.",
      },
    ],
  },
  {
    slug: "tripadvisor-vs-google-maps-vs-zolo",
    title: "Tripadvisor vs Google Maps vs Zolo: Which Is Best for Finding Things to Do?",
    seoTitle: "Tripadvisor vs Google Maps vs Zolo: Which to Use",
    description:
      "Three different tools solve three different problems. Here's when each one actually makes sense, and why they're not really competing with each other.",
    publishedAt: "2026-09-12",
    updatedAt: "2026-10-12",
    sources: [
      {
        label: "Google Business Profile Help, \"Tips to improve your local ranking on Google\"",
        url: "https://support.google.com/business/answer/7091",
        note: "Google's description of what local results are based on: relevance, distance, and popularity.",
      },
      {
        label: "Tripadvisor, \"Everything You Need to Know About the Tripadvisor Popularity Ranking\"",
        url: "https://www.tripadvisor.com/business/insights/resources/tripadvisor-popularity-ranking",
        note: "Tripadvisor's own description of its popularity ranking: based on the quality, recency, and quantity of reviews, and their consistency over time.",
      },
      {
        label:
          "Iyengar & Lepper (2000), \"When Choice Is Demotivating: Can One Desire Too Much of a Good Thing?\", Journal of Personality and Social Psychology",
        url: "https://doi.org/10.1037/0022-3514.79.6.995",
        note: "Three experiments in which people offered 6 options were more likely to act, and more satisfied, than people offered 24 or 30.",
      },
    ],
    readingMinutes: 9,
    heroImage: {
      src: "https://images.unsplash.com/photo-1526779259212-939e64788e3c?auto=format&fit=crop&w=1600&q=80",
      alt: "A person sitting on a rock overlooking water at sunset, exploring somewhere new",
    },
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
          "Its weakness is the flip side of the same strength: it's a map of literally everything, with no sense of who's looking. Search \"things to do near me\" and you get the same ranked list everyone else gets, sorted mostly by [popularity and proximity](https://support.google.com/business/answer/7091), with no idea whether you're into quiet museums or loud bars. It answers \"what's there,\" not \"what fits me.\" [See a fuller comparison](/vs/zolo-vs-google-maps).",
        ],
      },
      {
        heading: "Tripadvisor: the traveler's consensus",
        paragraphs: [
          "Tripadvisor is built for a specific moment: you're traveling somewhere unfamiliar and want a second opinion from people who've already been there. Its review depth and \"Top 10 things to do in [city]\" lists are genuinely useful for orienting yourself in a new place fast.",
          "The tradeoff is that it optimizes for consensus (its popularity ranking is [based on the quality, recency, and quantity of reviews](https://www.tripadvisor.com/business/insights/resources/tripadvisor-popularity-ranking)), which tends to concentrate attention on the same handful of famous attractions in every city — the ones already crowded with other tourists reading the same list. It's also built around trips, not your regular weekend at home, and like Google Maps, it isn't personalizing to your specific interests or budget — everyone sees roughly the same \"best of\" ranking. [More on how Zolo differs from Tripadvisor specifically](/vs/zolo-vs-tripadvisor).",
        ],
      },
      {
        heading: `Zolo: personalization, not just more listings`,
        paragraphs: [
          `${brand.name} isn't trying to out-list Google Maps or out-review Tripadvisor — it starts from a different question: given everything that exists nearby, what's actually worth doing for this specific person, right now? It combines your stated interests, budget, and personality with a scoring model and AI reasoning that explains each pick — [more on how that reasoning actually works](/blog/how-ai-is-changing-the-way-we-discover-things-to-do) — so you get a short list instead of an overwhelming one ([choice-overload research](https://doi.org/10.1037/0022-3514.79.6.995) suggests fewer options make it easier to act), plus surfacing genuine hidden gems that a pure popularity ranking would bury.`,
          "It's also honest about where it can't help: for real-time specifics like exact hours or live availability, or for deep destination research while traveling, Google Maps and Tripadvisor are still the right tool — which is exactly why every recommendation links out to real booking or map data rather than trying to fake it.",
        ],
      },
      {
        heading: "Side by side",
        paragraphs: ["A quick way to see how the three actually differ in practice:"],
        table: {
          headers: ["", "Google Maps", "Tripadvisor", "Zolo"],
          rows: [
            ["Best for", "\"I know what I want\"", "Trip research in a new city", "\"I don't know what I want yet\""],
            ["Personalized to you", "No", "No", "Yes — interests, budget, personality"],
            ["Explains its reasoning", "No", "No", "Yes, in plain language"],
            ["Real-time hours & directions", "Yes", "Limited", "Links out to Maps for this"],
            ["Traveler review depth", "High", "Very high", "Not its focus"],
            ["Good for a regular weekend at home", "Yes, if you already know where", "Not really — trip-focused", "Yes — this is the core use case"],
          ],
        },
      },
      {
        heading: "Using them together",
        paragraphs: [
          "In practice these tools aren't mutually exclusive. A reasonable flow: use Zolo when you don't know what you want yet and want a short, personalized list with a reason attached. Use Google Maps once you've picked something, to check hours and get directions. Use Tripadvisor when you're deep in trip-planning mode and want traveler consensus on the big, famous must-sees in a new city. For a concrete, non-travel example of the first case, see [our fall date ideas roundup](/blog/fall-date-ideas-cozy-adventurous-budget-friendly).",
          "Different jobs, different tools. The mistake is expecting a general-purpose map or a traveler review site to do the one thing neither was built for: understanding you specifically. If that's the gap you keep hitting, [see Zolo's pricing](/pricing) or [create a free account](/signup) to try it against your own weekend.",
        ],
      },
    ],
    faq: [
      {
        q: "Is Zolo a Tripadvisor alternative?",
        a: "It solves a different problem more than it competes directly — Tripadvisor is built for researching a trip to an unfamiliar city, while Zolo is built for personalized discovery anywhere, including your own city on a regular weekend. Many people use both.",
      },
      {
        q: "Can I use Zolo and Google Maps together?",
        a: "Yes, and that's the intended flow — Zolo narrows down what to do, then every recommendation links out to real map data for directions, hours, and live details rather than duplicating what Google Maps already does better.",
      },
      {
        q: "Does Zolo replace Google Maps directions?",
        a: "No. Zolo doesn't build its own maps or directions product — it links out to Google Maps for that, since that's already the best tool for the job.",
      },
      {
        q: "Is Tripadvisor better for international travel?",
        a: "For researching a new city's must-see attractions and reading dense traveler reviews before a trip, Tripadvisor's depth is hard to beat. Zolo's Travel Mode covers a growing set of destinations with personalized recommendations and AI-planned itineraries, but it isn't trying to replace Tripadvisor's review archive.",
      },
      {
        q: "Which is better for a local weekend, not a trip?",
        a: "Zolo — it's built specifically for \"what should I do near me this weekend,\" personalized to your interests and budget, whereas Google Maps and Tripadvisor both work better once you already know roughly what you're looking for.",
      },
    ],
  },
  {
    slug: "fall-date-ideas-cozy-adventurous-budget-friendly",
    title: "Fall Date Ideas: Cozy, Adventurous & Budget-Friendly Picks",
    seoTitle: "Fall Date Ideas: Cozy, Adventurous & Budget Picks",
    description:
      "Real, doable date ideas for every fall mood — cozy nights in, outdoor adventures, and budget-friendly options that don't feel like a compromise.",
    publishedAt: "2026-09-13",
    updatedAt: "2026-10-12",
    sources: [
      {
        label: "U.S. Forest Service, \"Fall Colors\"",
        url: "https://www.fs.usda.gov/visit/fall-colors",
        note: "The Forest Service's guide to finding fall colors on national forests.",
      },
      {
        label: "USDA Agricultural Marketing Service, \"National Farmers Market Directory\"",
        url: "https://www.ams.usda.gov/local-food-directories/farmersmarkets",
        note: "A directory of farmers markets with locations, directions, operating times, product offerings, and accepted forms of payment.",
      },
    ],
    readingMinutes: 8,
    heroImage: {
      src: "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?auto=format&fit=crop&w=1600&q=80",
      alt: "A quiet road lined with orange and red fall foliage",
    },
    sections: [
      {
        paragraphs: [
          "Fall has a way of making people want to plan something. The weather turns, the light gets softer earlier in the evening, and there's a built-in excuse for warm drinks, layers, and slower plans. But \"let's do something for fall\" often collapses into the same dinner reservation, because coming up with an actual idea — one that fits your budget, your energy level, and the person you're seeing — takes more thought than it should.",
          "The ideas below aren't a list of the ten best pumpkin patches in America. The guide is a set of real, repeatable date categories organized by mood, so you can pick based on how you actually want the night to feel, then go find the specific version of that mood near you.",
        ],
      },
      {
        heading: "Cozy",
        paragraphs: [
          "Cozy dates work best when there's no rush — the point is unhurried conversation, not a packed itinerary. Good cozy dates share a few traits: comfortable seating, low noise, and something small to do with your hands (a mug, a menu, a book) so silences don't feel like a test.",
        ],
        list: [
          "A coffee shop or tea house with actual seating, not a counter-service line — worth checking for one with couches or a window nook.",
          "A bookstore date: wander separately for ten minutes, then each pick a book for the other and explain why.",
          "Cooking a new recipe together at home — pick something neither of you has made before, so you're both a little bad at it together.",
          "A wine or cocktail bar with a fireplace, or just genuinely comfortable indoor seating.",
          "A matinee movie followed by a walk — matinees are cheaper and less crowded, and the walk after gives you something to talk about.",
          "Hot chocolate or apple cider, then a slow walk through a neighborhood with good fall color.",
          "A board game café, or just board games at home with good snacks.",
        ],
      },
      {
        heading: "Adventurous",
        paragraphs: [
          "Adventurous dates work well when you want a shared challenge or activity to anchor the conversation around — especially useful earlier in a relationship, when \"just talking\" for three hours can feel like a lot of pressure. The activity does some of the work for you.",
        ],
        list: [
          "Apple picking or a pumpkin patch — genuinely fun even if you're not the type who'd normally do it.",
          "A fall hike somewhere with real elevation change or a view — foliage season makes even a familiar trail feel new (the U.S. Forest Service has a [guide to finding fall colors on national forests](https://www.fs.usda.gov/visit/fall-colors)).",
          "A corn maze or a local fall festival, if your area has one.",
          "Kayaking or canoeing before it gets too cold — often quieter and cheaper in fall than peak summer.",
          "An escape room — built-in teamwork, built-in stakes, over in an hour.",
          "Indoor rock climbing, especially if neither of you has done it — shared beginner energy is a good icebreaker.",
          "A scenic overlook or lookout point at sunset, ideally reached by a short drive or walk rather than just pulling up and parking.",
        ],
      },
      {
        heading: "Budget-Friendly",
        paragraphs: [
          "Budget-friendly doesn't have to mean \"the cheap option\" — a budget-friendly date means picking something where the shared experience is the actual point, not the price tag. Some of the best fall dates cost almost nothing.",
        ],
        list: [
          "Free museum days — many museums and galleries have a free day or free evening hours once a month; worth checking before you assume admission is required.",
          "A public park walk timed for peak foliage — free, and genuinely one of the best fall activities regardless of budget.",
          "A home-cooked picnic — pack food you already have, find a good spot, total cost close to zero.",
          "Farmers markets — free to browse, and affordable for a shared snack or two while you walk through (the USDA's [National Farmers Market Directory](https://www.ams.usda.gov/local-food-directories/farmersmarkets) lists markets by location).",
          "Free outdoor concerts or fall festivals — a lot of towns run these and they're easy to miss if you're not looking.",
          "A library or community-center event — often free, often underrated as a date idea.",
          "A scenic drive — the only real cost is gas, and fall is the best season for it.",
          "A DIY tasting night at home — cheese, chocolate, cider, whatever you're into — cheap, low-effort to set up, and gives you something to actually discuss.",
        ],
      },
      {
        heading: "The real bottleneck isn't ideas — it's matching one to tonight",
        paragraphs: [
          `Reading a list like this is the easy part. The harder part is picking the right version of "cozy" or "adventurous" for a specific budget, a specific person, and a specific night — and then actually finding a real place nearby that fits, instead of falling back to the same restaurant again. That's the exact gap ${brand.name} is built to close: tell ${brand.name} your budget, your interests, and what kind of night you're going for, and ${brand.name} turns a mood ("something cozy, under $25, nothing we've already done") into a short list of real, specific places near you — with a reason attached for each one, not just a rating. [See how the matching actually works](/blog/how-ai-is-changing-the-way-we-discover-things-to-do).`,
          `If you'd rather not choose from a list at all, Surprise Me picks something for you directly — useful on the nights where the real obstacle isn't lack of options, it's decision fatigue. Either way, the categories above are a starting point, not the destination — the point is to land on a mood, then let ${brand.name} handle turning that mood into an actual plan. [Create a free account](/signup) or [see what's included with Premium](/pricing) if you want unlimited personalized picks all season. If you're weighing this against other tools for finding things to do, see [how Zolo, Google Maps, and Tripadvisor actually differ](/blog/tripadvisor-vs-google-maps-vs-zolo).`,
        ],
      },
    ],
    faq: [
      {
        q: "How much should a fall date actually cost?",
        a: "Whatever fits your actual budget — several ideas above (park walks, farmers markets, home-cooked picnics, library events) cost close to nothing, and the \"budget-friendly\" category exists specifically because a low price tag doesn't have to mean a lower-effort date.",
      },
      {
        q: "What if the weather ruins an outdoor plan?",
        a: "Have a cozy-category backup in mind before you go, especially for anything in the adventurous list — a hike or scenic drive can turn into a bookstore visit or a home-cooked recipe night with almost no lost planning.",
      },
      {
        q: "How far in advance should I plan a fall date?",
        a: "For anything with limited capacity or a specific event (a corn maze, a festival, a popular restaurant), a few days ahead is safer. Most of the ideas here — a park walk, a coffee shop, a scenic drive — work fine decided same-day.",
      },
      {
        q: "What if we've already done everything on this list?",
        a: "Once a general list has run out, the next step is something matched to your specific interests and city — which is exactly what a personalized discovery tool like Zolo is for, rather than a longer version of the same generic list.",
      },
    ],
  },
  {
    slug: "things-to-do-this-weekend-near-new-york",
    title: "Things to Do This Weekend Near New York: A No-Planning Guide",
    seoTitle: "Things to Do This Weekend Near New York",
    description:
      "Not sure what to do this weekend in New York? Spontaneous, no-planning ideas — free activities, food spots, and things to do near you, by vibe.",
    publishedAt: "2026-09-19",
    updatedAt: "2026-10-12",
    sources: [
      {
        label: "NYC DOT, \"Staten Island Ferry\"",
        url: "https://www.nyc.gov/html/dot/html/ferrybus/staten-island-ferry.shtml",
        note: "NYC DOT operates the Staten Island Ferry as a free service between Staten Island and Lower Manhattan, every day of the week, year-round.",
      },
      {
        label: "The High Line, \"Plan Your Visit\"",
        url: "https://www.thehighline.org/visit/",
        note: "The High Line's own visitor information, including its seasonal hours and its commitment to keeping the public space free.",
      },
      {
        label: "NYC Parks, \"Free and Low-cost Events\"",
        url: "https://www.nycgovparks.org/events",
        note: "NYC Parks' official, searchable listing of free and low-cost events in parks across the city.",
      },
    ],
    readingMinutes: 7,
    heroImage: {
      src: "https://images.unsplash.com/photo-1673296633888-6fa24514d256?auto=format&fit=crop&w=1600&q=80",
      alt: "People walking the High Line in New York City",
    },
    sections: [
      {
        paragraphs: [
          "If you're searching \"things to do this weekend near me\" for the third weekend in a row with zero results, you're not alone — and you don't need another 47-tab research session to fix it. Whether you're in Manhattan, Brooklyn, Queens, or just outside the city, here's a no-planning guide to spontaneous weekend plans in New York, organized by vibe so you can pick one and go.",
        ],
      },
      {
        heading: "Cozy & Low-Key Weekend Plans",
        paragraphs: ["Sometimes the best weekend plans near you don't require leaving your neighborhood."],
        list: [
          "Coffee shop hopping — pick two or three cafés in a neighborhood you don't usually visit (the West Village, Williamsburg, or Astoria all work well) and turn it into a mini crawl.",
          "Bookstore browsing — The Strand, McNally Jackson, or a local indie shop make for an easy, free way to spend an afternoon.",
          "Rooftop or park picnic — grab takeout and head to Domino Park, Fort Greene Park, or the Brooklyn Heights Promenade for skyline views without the ticket price.",
          "Museum member hours or free days — several major NYC museums offer pay-what-you-wish evenings, worth checking before you commit to a full-price ticket.",
        ],
      },
      {
        heading: "Active & Outdoorsy Ideas",
        paragraphs: ["If you want a weekend activity that gets you moving:"],
        list: [
          "Walk the High Line — start to finish, it's one of the most reliable free things to do in NYC any time of year (the [High Line's own visitor page](https://www.thehighline.org/visit/) covers hours and describes keeping the public space free for everyone).",
          "Bike the Hudson River Greenway — rent a Citi Bike and ride from Battery Park up to the GWB, or as far as you feel like going.",
          "Kayaking on the Hudson — free public kayaking is available seasonally at a few Manhattan and Brooklyn boathouses.",
          "Explore a new park entirely — Prospect Park, Governors Island, or Van Cortlandt Park all feel like a day trip without leaving city limits.",
        ],
      },
      {
        heading: "Culture & Indoor Plans (Good for Any Weather)",
        paragraphs: ["A good backup list for when the weather doesn't cooperate:"],
        list: [
          "A neighborhood you've never explored — Jackson Heights, Sunset Park, and the East Village all reward wandering with no agenda.",
          "A small, offbeat museum — the Tenement Museum, the Merchant's House Museum, or the Morbid Anatomy space offer a different experience than the big-name institutions.",
          "Live jazz or an open mic — Manhattan and Brooklyn have no shortage of low-cover venues for a spontaneous night out.",
          "A matinee show — same-day rush and lottery tickets make Broadway more accessible than people assume.",
        ],
      },
      {
        heading: "Food-Focused Weekend Ideas",
        paragraphs: ["Sometimes the plan should just be built around eating well:"],
        list: [
          "Try a cuisine you've never had — Flushing, Jackson Heights, and Sunset Park are some of the best food-exploration neighborhoods in the country.",
          "Weekend food markets — Smorgasburg (seasonal), Chelsea Market, or DeKalb Market Hall are built for wandering and grazing.",
          "Brunch somewhere new — instead of your usual spot, pick a neighborhood at random and find whatever's busiest.",
        ],
      },
      {
        heading: "Free & Budget-Friendly Options",
        paragraphs: ["A weekend in New York doesn't have to cost anything:"],
        list: [
          "Staten Island Ferry — free, and one of the best skyline views in the city (NYC DOT [runs it as a free service](https://www.nyc.gov/html/dot/html/ferrybus/staten-island-ferry.shtml) every day of the week, year-round).",
          "Free museum days and pay-what-you-wish hours.",
          "Central Park or Prospect Park — always free, always different depending on the season (NYC Parks also lists [free and low-cost events](https://www.nycgovparks.org/events) across the city's parks).",
          "Public art installations and open studios, which rotate throughout the city.",
        ],
      },
      {
        heading: "The Real Problem: Too Many Options, No Time to Sort Them",
        paragraphs: [
          "The hardest part of a New York weekend usually isn't a lack of things to do — it's the opposite. Deciding what fits your mood, budget, and location right now is what eats the time you meant to spend actually doing something.",
          `That's the exact problem ${brand.name}'s Surprise Me feature solves: tell it your vibe, and it gives you a personalized plan nearby in seconds — no scrolling, no fifteen open tabs, no group chat debate. [Here's how that matching actually works](/blog/how-ai-is-changing-the-way-we-discover-things-to-do). If you'd rather have next weekend already planned, the Weekend Planner does that automatically based on what you actually like — [create a free account](/signup) to try either, or [see what's included with Premium](/pricing). And if a New York weekend has you in more of a date-night mood than a solo-wander one, [our fall date ideas roundup](/blog/fall-date-ideas-cozy-adventurous-budget-friendly) covers that ground too.`,
        ],
      },
    ],
    faq: [
      {
        q: "What's a good last-minute weekend plan in New York?",
        a: "Pick a vibe first — cozy, active, cultural, or food-focused — then a specific idea from that category, rather than starting from scratch. A High Line walk, a new-to-you neighborhood, or a food market all work well with zero advance planning.",
      },
      {
        q: "What are the best free things to do in NYC?",
        a: "The Staten Island Ferry, the High Line, Central Park and Prospect Park, and most museums' pay-what-you-wish hours are all genuinely free and repeatable — not one-time novelties.",
      },
      {
        q: "What's a good backup plan if the weather's bad?",
        a: "Keep an indoor option in your back pocket from the Culture & Indoor Plans list above — a small museum, a matinee show, or live jazz all work regardless of weather, so an outdoor plan can flip to an indoor one without losing the day.",
      },
      {
        q: "How is this different from just Googling \"things to do near me\"?",
        a: `A search engine gives you an unsorted list and leaves the deciding to you — which is exactly the problem when you're short on planning time. ${brand.name} narrows that same universe of real places down to a short list matched to your budget, interests, and mood, with a reason attached to each pick.`,
      },
    ],
  },
  {
    slug: "things-to-do-on-a-rainy-day",
    title: "Things to Do on a Rainy Day Near You: Indoor Ideas for Every Mood",
    seoTitle: "Things to Do on a Rainy Day Near You",
    description:
      "Rainy day ideas near you, sorted by mood: cozy, active, creative, free, date, friends, solo, and student picks. Find indoor spots and decide fast.",
    publishedAt: "2026-10-19",
    sources: [
      {
        label: "National Weather Service, \"Lightning Safety Overview\"",
        url: "https://www.weather.gov/safety/lightning-safety-overview",
        note: "The National Weather Service's advice to go indoors when thunder is heard and to wait 30 minutes after the last lightning or thunder before going back outside.",
      },
      {
        label: "CDC, \"Safety Guidelines: Lightning\"",
        url: "https://www.cdc.gov/lightning/safety/index.html",
        note: "The CDC's lightning safety guidance: when thunder roars, go indoors, and do not resume outdoor activities for at least 30 minutes after the storm.",
      },
    ],
    readingMinutes: 10,
    sections: [
      {
        paragraphs: [
          "When it rains, the hard part is not finding ideas. It is that most ideas seem to need good weather, and most lists have no idea where you are.",
          "This guide collects rainy day things to do near you, sorted by mood and situation: cozy, active, creative, free, with a date, with friends, alone, and for college students. Read the section that matches how you feel, then use the last section to find the actual spots closest to you.",
          "In a hurry? Five fast picks:",
        ],
        list: [
          "Browse a bookstore or record store, then settle into a café nearby",
          "Visit a museum, gallery, or glass conservatory",
          "Play something: bowling, an arcade, or a climbing gym",
          "Take a one-off pottery or cooking class",
          "Stay in, but make it an event, like a themed movie marathon or an all-afternoon cook",
        ],
      },
      {
        heading: "Cozy Rainy Day Activities",
        paragraphs: [
          "The best cozy rainy day activities make staying in feel like a choice, not a consolation prize. The trick is to commit to one idea early instead of drifting between screens.",
        ],
        list: [
          "Cook something slow. A braise, a soup, fresh bread, or a big batch of something you will eat all week. Long, low-effort cooking fits wet weather.",
          "Run a themed movie marathon. Pick a director, a decade, or a genre and watch three in a row, rather than scrolling for an hour first.",
          "Finish one small mess. A desk drawer, a bookshelf, your camera roll. Small and finishable beats ambitious and abandoned.",
          "Set up a puzzle or a game. A jigsaw on a table you leave out for days, or a card or board game with whoever is home.",
          "Start the book you keep postponing. Make tea, put your phone in another room, and give it two hours.",
          "Write the messages you have been putting off. A letter, a long reply, a thank-you note.",
        ],
      },
      {
        paragraphs: [
          "If you would rather be warm and around other people, the next section covers the outing version of cozy.",
        ],
      },
      {
        heading: "Rainy Day Things to Do Near You When You Want to Get Out of the House",
        paragraphs: [
          "The best rainy day outings are fully indoors, easy to reach from parking or transit, and fine to walk into without a reservation. These types of places fit that description almost everywhere.",
        ],
        list: [
          "Museums and galleries. Smaller and specialty museums give you a few hours of something new without a big ticket price. Check for discounted or pay-what-you-wish hours.",
          "Bookstores, record stores, and comic shops. Browsing is the activity and buying is optional. Independent shops tend to reward a slow lap.",
          "A café with a good seat. Choose one with big windows, plan on staying two hours, and bring something to read or work on.",
          "Arcades, bowling alleys, and indoor mini-golf. Built-in structure means no one has to plan anything once you arrive.",
          "Cinemas. A weekday matinee is cheap, and independent or repertory theaters often show things you would not otherwise see.",
          "Greenhouses and conservatories. Many botanical gardens have glass houses that feel warm, green, and the opposite of the weather outside.",
          "Aquariums. Dim, calm, and fully covered, which suits a gray afternoon.",
          "Food halls and indoor markets. A walk-and-graze format works well when people want different things.",
        ],
      },
      {
        paragraphs: [
          "Popular indoor spots fill up when the weather turns, so check the hours before you leave and arrive earlier in the day if you can. For a plan that covers a whole weekend, see our [weekend guide for New York](/blog/things-to-do-this-weekend-near-new-york).",
        ],
      },
      {
        heading: "Active Rainy Day Activities That Keep You Indoors",
        paragraphs: ["You can still burn off energy on a rainy day. You just need a roof."],
        list: [
          "Indoor climbing gyms. Most offer day passes and rental shoes, so beginners can drop in without owning anything.",
          "Trampoline parks and skating rinks. Roller and ice skating are both easier to enjoy with a friend to laugh at the wobbles with.",
          "Indoor pools. Rain stops mattering once you are already wet.",
          "Drop-in fitness and dance classes. Many studios discount a first class, which makes a rainy day a low-risk time to try something new.",
          "Pool halls and ping pong bars. Casual, social, and good for any skill level.",
          "A long walk through somewhere big. A large museum, a covered market, or a mall adds up to more steps than you would expect.",
        ],
      },
      {
        heading: "Creative and Hands-On Rainy Day Activities",
        paragraphs: [
          "Rainy afternoons suit making things, because you are already committed to staying put. Doing it somewhere other than your couch makes it feel like an outing.",
        ],
        list: [
          "Pottery or ceramics. Many studios run one-off wheel or hand-building sessions with no experience needed, and you leave with something you made.",
          "Cooking, baking, or drink workshops. A class gives you a skill and a meal, and it is easy to book as a pair or a group.",
          "Thrifting and antique shopping. Indoor, cheap, and endlessly different from one shop to the next.",
          "Painting, printmaking, or open studio nights. Look for sessions that supply materials so you can show up empty-handed.",
          "A skill project at home. Learn a few chords, a knitting stitch, or a new recipe technique, and treat the afternoon as practice, not performance.",
        ],
      },
      {
        heading: "Free Rainy Day Activities Near You",
        paragraphs: [
          "You can fill a rainy day for nothing if you know which kinds of places do not charge. Start with these.",
        ],
        list: [
          "Public libraries. Books, quiet seating, board games, free events, and in some places museum passes you can borrow.",
          "Free museum days and pay-what-you-wish hours. Many museums run them on a set evening or day each week, so check each site's visit page.",
          "Browsing without buying. Bookstores, plant shops, and big department stores are all warm, dry, and free to wander.",
          "Community events. Open mics, gallery openings, lectures, and community center classes are often free. Venue calendars and local bulletin boards list them.",
          "Grand indoor spaces. Train station concourses, atriums, and covered arcades are free to walk through and often worth seeing for the architecture alone.",
          "Home options. Free workout videos, free online courses, and a cook-from-the-pantry challenge cost nothing and fill an afternoon.",
        ],
      },
      {
        paragraphs: [
          "A useful rule when money is tight: pick one paid thing, like a coffee or a movie ticket, and make everything around it free.",
        ],
      },
      {
        heading: "Rainy Day Date Ideas",
        paragraphs: [
          "Rain makes a date easier, not harder, because it gives you a reason to stay close and take your time. Pick the tone you want.",
        ],
        list: [
          "Cozy: cook a new recipe together, spend two hours at a café table with a deck of cards, or visit a bookstore and each choose a book for the other.",
          "Playful: bowl or play arcade games with a small bet on the line, try indoor mini-golf, or take a one-off pottery class.",
          "Low-key and cheap: visit a museum during free or pay-what-you-wish hours, set up a themed movie night with a matching dinner, or start a jigsaw puzzle.",
        ],
      },
      {
        paragraphs: [
          "Whichever you choose, give the date a shape: one main activity, a stop before it (coffee) and a stop after it (dessert). On clear, cooler days, see our [fall date ideas guide](/blog/fall-date-ideas-cozy-adventurous-budget-friendly) for seasonal options.",
        ],
      },
      {
        heading: "Rainy Day Ideas With Friends",
        paragraphs: [
          "The best rainy day plans for a group are easy to join, easy to split, and easy to cancel. That rules out anything that needs advance tickets or one person hosting.",
        ],
        list: [
          "A food hall or indoor market. Everyone orders what they want and you meet at one table.",
          "Bowling, arcades, or an escape room. The activity supplies the structure, so no one has to run the afternoon.",
          "A board game café. Staff teach the rules, which saves the usual twenty minutes of arguing over the rulebook.",
          "Karaoke. Private rooms make it easier for a nervous group to commit.",
          "A potluck or game night at someone's place. Assign each person one dish or one game to bring.",
          "A group class. Cooking and pottery both work well for four to six people.",
        ],
      },
      {
        paragraphs: [
          "To skip the group chat debate, offer two options and let everyone vote once. A decision in five minutes leaves more of the day for the plan itself.",
        ],
      },
      {
        heading: "Rainy Day Things to Do Alone",
        paragraphs: [
          "A rainy day alone is a good excuse to go somewhere you would never drag anyone else. You set the pace, so nobody waits on you.",
        ],
        list: [
          "A long museum visit. Skip what bores you, stay as long as you like in front of what does not.",
          "A café with a book or a journal. Take the table by the window and stay for two drinks.",
          "A solo matinee. Going alone means you pick the film and sit where you want.",
          "A drop-in workshop or class. Pottery, cooking, and open studios are easy places to meet people without forcing it.",
          "A reset day. Laundry, meal prep, and planning the week feel better against the sound of rain, and they make tomorrow easier.",
        ],
      },
      {
        heading: "Rainy Day Ideas for College Students",
        paragraphs: [
          "College students have an advantage on rainy days: campus supplies free indoor space, and a student ID unlocks discounts off campus.",
        ],
        list: [
          "On campus: libraries, student centers, gyms and pools, campus galleries, and club events. Your school's events calendar usually lists free screenings, performances, and talks.",
          "Off campus with a student ID: many museums, cinemas, and theaters offer student pricing, so ask at the counter even when it is not advertised.",
          "Cheap group plans: bowling, an arcade, a board game café, or a thrift run, with one food hall order split between you.",
          "A study reward: work for two hours at a café you have not tried, then spend the last hour doing something that is not studying.",
          "A roommate cook-off: set a spending cap per person and see who makes the best meal.",
          "If you are new to the area: a rainy day is a low-pressure time to find out what is close to campus, since you are not trying to see everything at once.",
        ],
      },
      {
        paragraphs: [
          `For picks near your own campus, see [${brand.name} for students](/students).`,
        ],
      },
      {
        heading: "How to Find Rainy Day Activities Near You",
        paragraphs: [
          "The fastest way to find a good rainy day spot is to search by the kind of place you want, then check a few things before you leave.",
        ],
        list: [
          "Search by place type, not by weather. \"Bowling near me\" or \"pottery class near me\" returns real, open businesses. \"Rainy day activities\" returns lists.",
          "Check today's hours. Some places close early or run on a different schedule on weekdays, and some need a booking or a timed ticket.",
          "Confirm it is actually indoors. Gardens, markets, and zoos are often part indoor and part outdoor. Look for words like \"fully covered\" or \"indoor exhibits\".",
          "Allow extra travel time. Rain slows traffic, fills parking lots, and delays transit.",
          "Pick a backup within walking distance. If the first place is full, you can switch without starting the search again.",
        ],
      },
      {
        paragraphs: [
          `If you would rather skip the searching, [${brand.name}](/) finds places near you based on your location and what you like. Tell it your mood, or use Surprise Me when you cannot decide, and you get spots worth going to instead of a page of generic results.`,
        ],
      },
      {
        heading: "Plan Less, Find More",
        paragraphs: [
          "Rainy days go best when you decide quickly and spend the saved time actually doing something. Pick a mood from this guide, choose the nearest place that fits, and keep a backup in mind.",
          `If you want help finding spots near you, ${brand.name} is a discovery app that suggests places based on where you are and what you like. Use Surprise Me when you cannot decide, and look for the indoor picks when the forecast turns. ${brand.name} has a free plan, so you can try it the next time it rains.`,
          "Bookmark this guide for the next gray weekend.",
        ],
      },
    ],
    faq: [
      {
        q: "What are good things to do on a rainy day when you are bored?",
        a: "Pick one of three types: go somewhere indoors with something to look at, like a museum, bookstore, or conservatory; play something, like bowling, an arcade, or a climbing gym; or make something, like a class or a long cook. Boredom on a rainy day is usually indecision, so choose the category first and the place second.",
      },
      {
        q: "What can I do on a rainy day for free?",
        a: "Visit a public library, use a museum's free or pay-what-you-wish hours, browse bookstores and indoor markets, or check venue calendars for free events. At home, cook from the pantry, run a movie marathon, or start a puzzle.",
      },
      {
        q: "What are fun things to do outside in the rain?",
        a: "In light rain with no thunder, a walk in a park, photographing reflections on wet streets, or a run in proper rain gear can all be enjoyable. If you hear thunder, go inside right away and wait 30 minutes after the last thunder before heading back out, as the National Weather Service advises.",
      },
      {
        q: "What are good rainy day activities for adults?",
        a: "Choose activities with a social or skill element instead of another screen: a class, a climbing gym, a game café, a food hall, or a long museum visit. The active and creative sections above are good places to start.",
      },
      {
        q: "What should I do on a rainy day if I have to stay home?",
        a: "Commit to one project that fills the afternoon: a slow recipe, a puzzle, a themed movie marathon, or a small organizing job. Silence notifications for two hours and treat it like a real plan.",
      },
      {
        q: "How do I find indoor things to do near me?",
        a: `Search by place type, such as "bowling near me" or "museum near me", check today's hours, and confirm the venue is fully indoors. A discovery app like ${brand.name} can also suggest places near you based on what you like.`,
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
