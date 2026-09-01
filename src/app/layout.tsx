import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { brand } from "@/lib/config/brand";
import { GoogleAttribution } from "@/components/shared/google-attribution";
import { GoogleAnalytics } from "@/components/shared/google-analytics";
import { SiteJsonLd } from "@/components/shared/site-jsonld";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(brand.domain),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  openGraph: {
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.description,
    siteName: brand.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.description,
  },
  // No explicit `icons` here — favicon.ico, icon.png, and apple-icon.png in
  // this directory are auto-detected by Next's file-convention system and
  // wired into <head> automatically. An explicit `icons` field would
  // override that and suppress icon.png/apple-icon.png.
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#14120f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SiteJsonLd />
        {children}
        <GoogleAttribution />
        <Toaster position="top-center" richColors closeButton />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
