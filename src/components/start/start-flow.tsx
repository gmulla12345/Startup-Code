"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { KeepCard, type KeepReason } from "@/components/start/keep-card";
import { ListPlaceRow } from "@/components/lists/list-place-row";
import { BUDGETS, OUTINGS, type BudgetId, type OutingId } from "@/lib/start/questions";
import { readFirstList, writeFirstList } from "@/lib/start/storage";
import type { FirstList } from "@/lib/start/types";
import { formatDistance } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * The first list, start to finish, for a visitor with no account: two questions, where
 * they are, then one list. It asks for an account only at the three moments one is
 * needed: keeping the list, keeping a place, starting a second list.
 *
 * What the browser remembers is only the answers and the places' ids (lib/start/storage.ts);
 * when the visitor comes back, or taps into a place and returns, the list is asked for again.
 * Where the visitor is gets used once, to look for places, and is neither kept nor shown again.
 */

type View =
  | { kind: "checking" }
  | { kind: "form" }
  | { kind: "working" }
  | { kind: "list"; list: FirstList }
  | { kind: "empty" }
  | { kind: "waiting" };

type Coords = { latitude: number; longitude: number };

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-4 py-2 text-sm transition-colors",
        selected ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-foreground hover:border-border-strong"
      )}
    >
      {children}
    </button>
  );
}

async function post(path: string, body: unknown) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export function StartFlow() {
  const [view, setView] = useState<View>({ kind: "checking" });
  const [outing, setOuting] = useState<OutingId | null>(null);
  const [budget, setBudget] = useState<BudgetId | null>(null);
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [keep, setKeep] = useState<{ reason: KeepReason; asked: boolean }>({ reason: "list", asked: false });
  const keepRef = useRef<HTMLDivElement>(null);

  // A list the visitor already has: ask for its places again (only ids were kept).
  useEffect(() => {
    let cancelled = false;
    const stored = readFirstList();
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage only exists after the page loads, so this is the first moment we can know there is no kept list
      setView({ kind: "form" });
      return;
    }
    (async () => {
      try {
        const { ok, json } = await post("/api/start/places", {
          outing: stored.outing,
          budget: stored.budget,
          ids: stored.picks.map((p) => p.experienceId),
        });
        if (cancelled) return;
        setView(ok && json.list ? { kind: "list", list: json.list } : { kind: "waiting" });
      } catch {
        if (!cancelled) setView({ kind: "waiting" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function askToKeep(reason: KeepReason) {
    setKeep({ reason, asked: true });
    requestAnimationFrame(() => keepRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function locateMe() {
    setMessage(null);
    if (!("geolocation" in navigator)) {
      // COPY: when the browser cannot share a location
      setMessage("We could not get your location. Type a city instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setCity("");
        setLocating(false);
      },
      () => {
        setLocating(false);
        // COPY: when the visitor declines, or the browser cannot find them
        setMessage("We could not get your location. Type a city instead.");
      },
      { timeout: 10_000 }
    );
  }

  async function makeList(e: React.FormEvent) {
    e.preventDefault();
    if (!outing || !budget) return;
    setMessage(null);
    setView({ kind: "working" });

    try {
      // A typed city is looked up (the same public lookup the onboarding screen uses).
      let where = coords;
      if (city.trim()) {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(city.trim())}`);
        const json = await res.json().catch(() => ({}));
        const first = json.results?.[0];
        if (!first) {
          // COPY: when a typed city is not found
          setMessage("We could not find that city. Try another.");
          setView({ kind: "form" });
          return;
        }
        where = { latitude: first.latitude, longitude: first.longitude };
      }
      if (!where) {
        setView({ kind: "form" });
        return;
      }

      const { ok, status, json } = await post("/api/start/list", { outing, budget, ...where });
      if (!ok) {
        setMessage(status === 429 ? json.error : "Something went wrong. Please try again.");
        setView({ kind: "form" });
        return;
      }
      if (!json.list) {
        setView({ kind: "empty" });
        return;
      }

      const list = json.list as FirstList;
      writeFirstList({
        outing,
        budget,
        picks: list.places.map((p) => ({ experienceId: p.id, tags: p.tags, category: p.category })),
      });
      setView({ kind: "list", list });
    } catch {
      setMessage("Something went wrong. Please try again.");
      setView({ kind: "form" });
    }
  }

  if (view.kind === "checking" || view.kind === "working") {
    return (
      <div className="flex items-center gap-3 py-10 text-foreground-muted" role="status">
        <Spinner className="h-5 w-5" />
        {/* COPY: while the list is being made */}
        {view.kind === "working" ? "Choosing places near you..." : "One moment..."}
      </div>
    );
  }

  if (view.kind === "list") {
    const { list } = view;
    return (
      <div className="space-y-6">
        <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="font-display text-xl font-semibold text-foreground">{list.title}</h2>
          <p className="mt-0.5 text-sm text-foreground-muted">{list.blurb}</p>
          <ol className="mt-3 divide-y divide-border">
            {list.places.map((p, i) => (
              <ListPlaceRow
                key={p.id}
                experience={p}
                index={i}
                why={p.why}
                localPick={p.localPick}
                distanceLabel={p.distanceMiles != null ? formatDistance(p.distanceMiles) : undefined}
                onSaveRequest={() => askToKeep("place")}
              />
            ))}
          </ol>
          <p className="mt-4 text-xs text-foreground-subtle">Powered by Google</p>
        </section>

        <div ref={keepRef}>
          <KeepCard reason={keep.reason} attention={keep.asked} />
        </div>

        <p className="text-sm text-foreground-muted">
          {/* COPY: the quiet way to ask for a second list */}
          <button type="button" onClick={() => askToKeep("another")} className="text-primary hover:underline">
            Start another list
          </button>
        </p>
      </div>
    );
  }

  if (view.kind === "waiting") {
    return (
      <div className="space-y-6">
        {/* COPY: when a kept list's places cannot be loaded just now */}
        <p className="text-foreground-muted">Your first list is saved. We could not load its places just now. Try again in a little while.</p>
        <KeepCard reason="list" attention={false} />
      </div>
    );
  }

  if (view.kind === "empty") {
    return (
      <div className="space-y-4">
        {/* COPY: when no list could be made */}
        <p className="text-foreground-muted">We could not find places near you just now. Try again in a little while.</p>
        <Button variant="outline" onClick={() => setView({ kind: "form" })}>
          Try again
        </Button>
      </div>
    );
  }

  const ready = Boolean(outing && budget && (coords || city.trim()));

  return (
    <form onSubmit={makeList} className="space-y-8">
      <fieldset className="space-y-3">
        {/* COPY: the first question */}
        <legend className="font-display text-lg font-semibold text-foreground">What kind of outing?</legend>
        <div className="flex flex-wrap gap-2">
          {OUTINGS.map((o) => (
            <Choice key={o.id} selected={outing === o.id} onClick={() => setOuting(o.id)}>
              {o.label}
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        {/* COPY: the second question */}
        <legend className="font-display text-lg font-semibold text-foreground">What feels right to spend?</legend>
        <div className="flex flex-wrap gap-2">
          {BUDGETS.map((b) => (
            <Choice key={b.id} selected={budget === b.id} onClick={() => setBudget(b.id)}>
              {b.label}
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        {/* COPY: where the visitor is, and what we do with it */}
        <legend className="font-display text-lg font-semibold text-foreground">Where are you?</legend>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" variant="outline" onClick={locateMe} disabled={locating} className="justify-center">
            {locating ? <Spinner className="h-4 w-4" /> : <LocateFixed className="h-4 w-4" />}
            {coords ? "Using your location" : "Use my location"}
          </Button>
          <Input
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              if (e.target.value) setCoords(null);
            }}
            placeholder="Or a city"
            aria-label="A city"
            maxLength={80}
          />
        </div>
        <p className="text-xs text-foreground-subtle">We use it once, to find places, and do not keep it.</p>
      </fieldset>

      {message && (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={!ready} className="w-full sm:w-auto">
        {/* COPY: the button that makes the list */}
        Show my list
      </Button>
    </form>
  );
}

