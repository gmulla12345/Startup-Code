"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AGE_RANGES } from "@/lib/config/taxonomy";
import { cn } from "@/lib/utils/cn";
import type { GeocodeResult } from "@/services/providers/types";

export interface BasicsData {
  firstName: string;
  ageRange: string;
  city: string;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function StepBasics({ data, onChange }: { data: BasicsData; onChange: (data: BasicsData) => void }) {
  const [cityQuery, setCityQuery] = useState(data.city);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (cityQuery.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears stale results when the query is too short to search
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(cityQuery)}`);
        const json = await res.json();
        setResults(json.results ?? []);
      } catch {
        setResults([]);
      }
    }, 300);
  }, [cityQuery]);

  function selectCity(result: GeocodeResult) {
    setCityQuery(result.city);
    setShowResults(false);
    onChange({
      ...data,
      city: result.city,
      region: result.region,
      country: result.country,
      latitude: result.latitude,
      longitude: result.longitude,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">What should we call you?</label>
        <Input
          placeholder="First name"
          value={data.firstName}
          onChange={(e) => onChange({ ...data, firstName: e.target.value })}
          autoFocus
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">How old are you?</label>
        <div className="grid grid-cols-3 gap-2">
          {AGE_RANGES.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onChange({ ...data, ageRange: range })}
              className={cn(
                "h-11 rounded-full border text-sm font-medium transition-colors",
                data.ageRange === range
                  ? "bg-ember text-white border-ember"
                  : "border-border-strong text-foreground hover:bg-surface-sunken"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <label className="text-sm font-medium text-foreground mb-1.5 block">Where are you based?</label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
          <Input
            className="pl-11"
            placeholder="City"
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
          />
        </div>
        {showResults && results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-raised)] overflow-hidden">
            {results.map((r) => (
              <button
                key={`${r.city}-${r.country}`}
                type="button"
                onClick={() => selectCity(r)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-sunken transition-colors"
              >
                {r.formattedAddress}
              </button>
            ))}
            <div className="px-4 py-1.5 text-[10px] text-foreground-subtle border-t border-border">Powered by Google</div>
          </div>
        )}
      </div>
    </div>
  );
}
