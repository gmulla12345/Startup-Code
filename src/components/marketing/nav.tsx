"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo />

        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map((link) =>
            link.href.startsWith("/#") ? (
              <a key={link.href} href={link.href} className="text-sm font-medium text-foreground-muted hover:text-foreground">
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-foreground-muted hover:text-foreground">
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Start Discovering</Link>
          </Button>
        </div>

        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border px-4 py-4 space-y-4 bg-surface">
          {LINKS.map((link) =>
            link.href.startsWith("/#") ? (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="block text-sm font-medium text-foreground">
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block text-sm font-medium text-foreground">
                {link.label}
              </Link>
            )
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Start Discovering</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
