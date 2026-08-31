"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatPrice, formatDuration } from "@/lib/utils/format";
import type { SurpriseMeResult } from "@/types/ai";

// Persists the most recent Surprise Me result so it can be reopened later —
// closing the card or leaving the page shouldn't lose it. Storing only the
// latest one is deliberate: this isn't a history, just "show me what I
// already got" instead of forcing a new AI call to see it again.
const STORAGE_KEY = "zolo:lastSurprise";

function loadStoredResult(): SurpriseMeResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SurpriseMeResult) : null;
  } catch {
    return null;
  }
}

function storeResult(result: SurpriseMeResult | null) {
  try {
    if (result) localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable (private browsing, etc.) — safe to no-op.
  }
}

export function SurpriseMeButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SurpriseMeResult | null>(null);
  const [savedResult, setSavedResult] = useState<SurpriseMeResult | null>(null);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage, which isn't available during SSR
    setSavedResult(loadStoredResult());
  }, []);

  function showResult(next: SurpriseMeResult) {
    setResult(next);
    setSavedResult(next);
    storeResult(next);
    setOpen(true);
  }

  function viewLastSurprise() {
    if (!savedResult) return;
    setResult(savedResult);
    setOpen(true);
  }

  async function fetchSurprise(exclude: string[] = []) {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/surprise-me?exclude=${exclude.join(",")}`);
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Couldn't find a recommendation right now.");
        setOpen(false);
        return;
      }

      if (!json.result) {
        toast.info(json.message ?? "No matches yet — try widening your interests.");
        setOpen(false);
        return;
      }

      showResult(json.result);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleNotForMe() {
    if (!result) return;
    const nextExclude = [...excludeIds, result.experience.id];
    setExcludeIds(nextExclude);

    setLoading(true);
    const res = await fetch("/api/ai/surprise-me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experienceId: result.experience.id, feedback: "not_for_me", excludeIds }),
    });
    const json = await res.json();
    setLoading(false);

    if (json.result) showResult(json.result);
    else {
      toast.info("That's all we've got for now — check back later.");
      setOpen(false);
    }
  }

  async function handleLetsGo() {
    if (!result) return;
    await fetch("/api/ai/surprise-me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experienceId: result.experience.id, feedback: "lets_go", excludeIds }),
    });
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => fetchSurprise(excludeIds)}
        disabled={loading}
        className="w-full rounded-[var(--radius-lg)] p-5 flex items-center gap-4 text-left bg-[linear-gradient(135deg,var(--ember),var(--ember-strong))] text-white shadow-[var(--shadow-raised)] hover:brightness-105 transition-all disabled:opacity-70"
      >
        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          {loading ? <Spinner className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        </div>
        <div className="flex-1">
          <div className="font-display text-lg font-semibold">{loading ? "Finding something..." : "Surprise Me"}</div>
          <div className="text-sm text-white/80">One perfect recommendation, right now.</div>
        </div>
      </button>

      {savedResult && (
        <button
          onClick={viewLastSurprise}
          className="mt-2 text-sm text-ember font-medium hover:underline"
        >
          View my Surprise: {savedResult.experience.title}
        </button>
      )}

      {open && result && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-surface rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="relative aspect-[4/3] bg-surface-sunken">
              {result.experience.images[0] && (
                <Image src={result.experience.images[0]} alt={result.experience.title} fill className="object-cover" />
              )}
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/50 flex items-center justify-center"
              >
                <X className="h-4 w-4 text-white" />
              </button>
              <div className="absolute bottom-3 left-3">
                <Badge variant="ember" className="bg-white/95 font-semibold">
                  {Math.round(result.recommendation.matchScore)}% match
                </Badge>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm font-medium text-ember mb-1">{result.headline}</p>
              <h3 className="font-display text-2xl font-semibold text-foreground mb-2">{result.experience.title}</h3>
              <p className="text-sm text-foreground-muted mb-3">{result.experience.shortDescription}</p>

              <div className="flex items-center gap-3 text-sm text-foreground-muted mb-4">
                <span>{result.experience.city}</span>
                <span>·</span>
                <span>{formatPrice(result.experience.priceEstimate, result.experience.priceLevel)}</span>
                {result.experience.durationMinutes && (
                  <>
                    <span>·</span>
                    <span>{formatDuration(result.experience.durationMinutes)}</span>
                  </>
                )}
              </div>

              <p className="text-sm italic text-foreground-muted border-l-2 border-ember pl-3 mb-6">
                &ldquo;{result.recommendation.reasoning}&rdquo;
              </p>

              <div className="flex flex-col gap-2">
                <Button asChild size="lg" onClick={handleLetsGo}>
                  <Link href={`/experience/${result.experience.slug}`}>Let&apos;s Go</Link>
                </Button>
                <Button variant="outline" size="lg" onClick={handleNotForMe} loading={loading}>
                  {loading ? "Finding another..." : "Not For Me"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
