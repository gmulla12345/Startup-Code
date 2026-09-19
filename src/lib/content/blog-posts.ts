import { brand } from "@/lib/config/brand";

export interface BlogSection {
  heading?: string;
  /**
   * Supports light inline markup: `[label](/path)` renders as a real
   * internal link (parsed in blog/[slug]/page.tsx) — kept as plain strings
   * rather than JSX so this stays content-as-data, same pattern as
   * vs-pages.ts.
   */
  paragraphs: string[];
  /** Optional bullet list rendered after the section's paragraphs. */
  list?: string[];
  /** Optional comparison table rendered after the section's paragraphs/list. */
  table?: { headers: string[]; rows: string[][] };
}

export interface BlogFaqItem {
  q: string;
  a: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  /** Used as the meta description and the card/list-page summary. */
  description: string;
  /** ISO date (YYYY-MM-DD). */
  publishedAt: string;
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
    readingMinutes: 8,
    heroImage: {
      src: "https://images.unsplash.com/photo-1522199755839-a2bacb67c546?auto=format&fit=crop&w=1600&q=80",
      alt: "A laptop showing a photo collage next to a warm drink, evoking browsing for something to do",
    },
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
          `The next step isn't more data — it's better use of the data you already generate just by living your life. Every place you save, skip, or actually go to is a signal. The systems that get this right treat every interaction as an update, not just a click to log, so week two's recommendations are measurably sharper than week one's, and a trip itinerary can be edited conversationally instead of regenerated from scratch. That's the direction ${brand.name} is built around: structured filtering and scoring doing the heavy lifting, AI reasoning explaining the "why," and the whole system getting sharper with actual use — not a longer list, a better one.`,
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
    description:
      "Three different tools solve three different problems. Here's when each one actually makes sense, and why they're not really competing with each other.",
    publishedAt: "2026-09-12",
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
          "Its weakness is the flip side of the same strength: it's a map of literally everything, with no sense of who's looking. Search \"things to do near me\" and you get the same ranked list everyone else gets, sorted mostly by popularity and proximity, with no idea whether you're into quiet museums or loud bars. It answers \"what's there,\" not \"what fits me.\" [See a fuller comparison](/vs/zolo-vs-google-maps).",
        ],
      },
      {
        heading: "Tripadvisor: the traveler's consensus",
        paragraphs: [
          "Tripadvisor is built for a specific moment: you're traveling somewhere unfamiliar and want a second opinion from people who've already been there. Its review depth and \"Top 10 things to do in [city]\" lists are genuinely useful for orienting yourself in a new place fast.",
          "The tradeoff is that it optimizes for consensus, which tends to concentrate attention on the same handful of famous attractions in every city — the ones already crowded with other tourists reading the same list. It's also built around trips, not your regular weekend at home, and like Google Maps, it isn't personalizing to your specific interests or budget — everyone sees roughly the same \"best of\" ranking. [More on how Zolo differs from Tripadvisor specifically](/vs/zolo-vs-tripadvisor).",
        ],
      },
      {
        heading: `Zolo: personalization, not just more listings`,
        paragraphs: [
          `${brand.name} isn't trying to out-list Google Maps or out-review Tripadvisor — it starts from a different question: given everything that exists nearby, what's actually worth doing for this specific person, right now? It combines your stated interests, budget, and personality with a scoring model and AI reasoning that explains each pick — [more on how that reasoning actually works](/blog/how-ai-is-changing-the-way-we-discover-things-to-do) — so you get a short list instead of an overwhelming one, plus surfacing genuine hidden gems that a pure popularity ranking would bury.`,
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
    description:
      "Real, doable date ideas for every fall mood — cozy nights in, outdoor adventures, and budget-friendly options that don't feel like a compromise.",
    publishedAt: "2026-09-13",
    readingMinutes: 8,
    heroImage: {
      src: "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?auto=format&fit=crop&w=1600&q=80",
      alt: "A quiet road lined with orange and red fall foliage",
    },
    sections: [
      {
        paragraphs: [
          "Fall has a way of making people want to plan something. The weather turns, the light gets softer earlier in the evening, and there's a built-in excuse for warm drinks, layers, and slower plans. But \"let's do something for fall\" often collapses into the same dinner reservation, because coming up with an actual idea — one that fits your budget, your energy level, and the person you're seeing — takes more thought than it should.",
          "This isn't a list of the ten best pumpkin patches in America. It's a set of real, repeatable date categories organized by mood, so you can pick based on how you actually want the night to feel, then go find the specific version of it near you.",
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
          "A fall hike somewhere with real elevation change or a view — foliage season makes even a familiar trail feel new.",
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
          "Budget-friendly doesn't have to mean \"the cheap option\" — it means picking something where the shared experience is the actual point, not the price tag. Some of the best fall dates cost almost nothing.",
        ],
        list: [
          "Free museum days — many museums and galleries have a free day or free evening hours once a month; worth checking before you assume admission is required.",
          "A public park walk timed for peak foliage — free, and genuinely one of the best fall activities regardless of budget.",
          "A home-cooked picnic — pack food you already have, find a good spot, total cost close to zero.",
          "Farmers markets — free to browse, and affordable for a shared snack or two while you walk through.",
          "Free outdoor concerts or fall festivals — a lot of towns run these and they're easy to miss if you're not looking.",
          "A library or community-center event — often free, often underrated as a date idea.",
          "A scenic drive — the only real cost is gas, and fall is the best season for it.",
          "A DIY tasting night at home — cheese, chocolate, cider, whatever you're into — cheap, low-effort to set up, and gives you something to actually discuss.",
        ],
      },
      {
        heading: "The real bottleneck isn't ideas — it's matching one to tonight",
        paragraphs: [
          `Reading a list like this is the easy part. The harder part is picking the right version of "cozy" or "adventurous" for a specific budget, a specific person, and a specific night — and then actually finding a real place nearby that fits, instead of falling back to the same restaurant again. That's the exact gap ${brand.name} is built to close: tell it your budget, your interests, and what kind of night you're going for, and it turns a mood ("something cozy, under $25, nothing we've already done") into a short list of real, specific places near you — with a reason attached for each one, not just a rating. [See how the matching actually works](/blog/how-ai-is-changing-the-way-we-discover-things-to-do).`,
          `If you'd rather not choose from a list at all, Surprise Me picks something for you directly — useful on the nights where the real obstacle isn't lack of options, it's decision fatigue. Either way, the categories above are a starting point, not the destination — the point is to land on a mood, then let something else handle turning that mood into an actual plan. [Create a free account](/signup) or [see what's included with Premium](/pricing) if you want unlimited personalized picks all season. If you're weighing this against other tools for finding things to do, see [how Zolo, Google Maps, and Tripadvisor actually differ](/blog/tripadvisor-vs-google-maps-vs-zolo).`,
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
        a: "That's the point where a general list stops being useful and you need something matched to your specific interests and city — which is exactly what a personalized discovery tool like Zolo is for, rather than a longer version of the same generic list.",
      },
    ],
  },
  {
    slug: "things-to-do-this-weekend-near-new-york",
    title: "Things to Do This Weekend Near New York: A No-Planning Guide",
    description:
      "Not sure what to do this weekend in New York? Get spontaneous, no-planning weekend ideas — free activities, food spots, and things to do near you, organized by vibe.",
    publishedAt: "2026-09-19",
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
          "Walk the High Line — start to finish, it's one of the most reliable free things to do in NYC any time of year.",
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
          "Staten Island Ferry — free, and one of the best skyline views in the city.",
          "Free museum days and pay-what-you-wish hours.",
          "Central Park or Prospect Park — always free, always different depending on the season.",
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
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
