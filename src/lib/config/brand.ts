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
  supportEmail: "team@discoverzolo.com",
} as const;

export const nav = {
  primary: [
    { label: "Home", href: "/home", icon: "home" },
    { label: "Discover", href: "/discover", icon: "compass" },
    { label: "Map", href: "/map", icon: "map" },
    { label: "Trips", href: "/trips", icon: "briefcase" },
    { label: "Saved", href: "/saved", icon: "bookmark" },
    { label: "Profile", href: "/profile", icon: "user" },
  ],
} as const;
