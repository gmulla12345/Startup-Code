"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { PillGroup } from "@/components/onboarding/pill-group";
import { CATEGORIES } from "@/db/seed-data";
import { BUDGET_LEVELS } from "@/lib/config/taxonomy";
import { cn } from "@/lib/utils/cn";

export interface DiscoverFilterState {
  search: string;
  category: string | null;
  priceLevel: string | null;
  indoorOutdoor: "indoor" | "outdoor" | "either";
  sort: "personalized" | "popular" | "hidden_gems";
}

export function DiscoverFilters({
  filters,
  onChange,
  showPersonalized,
}: {
  filters: DiscoverFilterState;
  onChange: (next: DiscoverFilterState) => void;
  showPersonalized: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
          <Input
            className="pl-11"
            placeholder="Search experiences, places, cities..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>

        {showPersonalized && (
          <Tabs
            value={filters.sort}
            onChange={(sort) => onChange({ ...filters, sort })}
            options={[
              { value: "personalized", label: "For You" },
              { value: "popular", label: "Popular" },
              { value: "hidden_gems", label: "Hidden Gems" },
            ]}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <SlidersHorizontal className="h-4 w-4 text-foreground-subtle" />
        <button
          onClick={() => onChange({ ...filters, category: null })}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium border",
            filters.category === null ? "bg-foreground text-background border-foreground" : "border-border-strong text-foreground-muted"
          )}
        >
          All categories
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onChange({ ...filters, category: filters.category === cat.id ? null : cat.id })}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap",
              filters.category === cat.id ? "bg-foreground text-background border-foreground" : "border-border-strong text-foreground-muted"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <PillGroup
        options={[{ value: "", label: "Any price" }, ...BUDGET_LEVELS]}
        value={filters.priceLevel ?? ""}
        onChange={(v) => onChange({ ...filters, priceLevel: v || null })}
      />
    </div>
  );
}
