"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqSection {
  title: string;
  items: FaqItem[];
}

export function FaqAccordion({ sections }: { sections: FaqSection[] }) {
  const [openKey, setOpenKey] = useState<string | null>(`${sections[0]?.title}-0`);

  return (
    <div className="space-y-12">
      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">{section.title}</h2>
          <div className="space-y-3">
            {section.items.map((item, i) => {
              const key = `${section.title}-${i}`;
              const isOpen = openKey === key;
              return (
                <div key={key} className="rounded-[var(--radius-md)] border border-border bg-surface overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                    onClick={() => setOpenKey(isOpen ? null : key)}
                    aria-expanded={isOpen}
                  >
                    <span className="font-medium text-foreground">{item.q}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-foreground-muted transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {isOpen && <p className="px-5 pb-4 text-sm text-foreground-muted leading-relaxed">{item.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
