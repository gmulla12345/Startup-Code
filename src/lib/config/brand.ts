/**
 * Central brand configuration. Change the product name, tagline, and identity
 * here — nothing else in the codebase should hard-code the brand name.
 */
export const brand = {
  name: "Zolo",
  fullName: "Zolo — Experience More of Life",
  tagline: "Experience more of life.",
  subTagline:
    "Discover places, experiences, adventures, and moments you'll actually love — personalized to you.",
  domain: process.env.NEXT_PUBLIC_APP_URL || "https://discoverzolo.com",
  description:
    "Zolo is a personalized discovery engine that learns who you are and recommends real-world experiences, adventures, and hidden gems you'll actually love.",
  social: {
    twitter: "@zoloapp",
    instagram: "@zolo",
  },
  /**
   * Full profile URLs for accounts this business actually owns (LinkedIn
   * company page, X, Instagram, YouTube, GitHub org, Crunchbase, ...). Fed
   * straight into the Organization JSON-LD's `sameAs` (see
   * site-jsonld.tsx), which is how search engines and AI assistants learn
   * that those profiles and this site are the same entity.
   *
   * Empty on purpose: `social` above is NOT a source for this -- neither
   * @zoloapp nor @zolo belongs to this business (checked 2026-09-01), and
   * listing someone else's account here would assert a false identity. Add a
   * URL only once the account exists and this business controls it.
   */
  sameAs: [] as readonly string[],
  supportEmail: "team@discoverzolo.com",
} as const;

export const nav = {
  primary: [
    { label: "Home", href: "/home", icon: "home" },
    { label: "Discover", href: "/discover", icon: "compass" },
    { label: "Map", href: "/map", icon: "map" },
    { label: "Saved", href: "/saved", icon: "bookmark" },
    { label: "Profile", href: "/profile", icon: "user" },
  ],
  // The planners stay, one step back: lists are the product now, so trips are not in the
  // bottom bar. The sidebar shows them as a quiet link, and the account menu and the end
  // of Home link to them on every screen size.
  secondary: [{ label: "Trips", href: "/trips", icon: "briefcase" }],
} as const;
