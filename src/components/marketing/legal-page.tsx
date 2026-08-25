import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-display text-4xl font-semibold text-foreground mb-2">{title}</h1>
      <p className="text-sm text-foreground-subtle mb-10">Last updated: {updated}</p>
      <div className="space-y-8 text-foreground-muted leading-relaxed [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-ember [&_a]:underline">
        {children}
      </div>
    </div>
  );
}
