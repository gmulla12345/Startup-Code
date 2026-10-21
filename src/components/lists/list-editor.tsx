"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { LIST_MAX_PLACES, LIST_MIN_PLACES, OWN_LIST_BLURB_MAX, OWN_LIST_TITLE_MAX } from "@/lib/config/lists";
import type { SavedChoice } from "@/lib/lists/own-choices";

export interface EditableList {
  id: string;
  title: string;
  blurb: string | null;
  experienceIds: string[];
  isPublic: boolean;
  showName: boolean;
}

/**
 * Making or changing a list of your own: a title and a line you write, and three to ten of the places you have saved, in
 * the order you want them. It is private to you unless you choose a link; your first name goes on it only if you tick it.
 * Every rule is checked again on the server; this only helps you meet them.
 */
export function ListEditor({ choices, initial, firstName }: { choices: SavedChoice[]; initial?: EditableList; firstName: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [blurb, setBlurb] = useState(initial?.blurb ?? "");
  const [selected, setSelected] = useState<string[]>(initial?.experienceIds ?? []);
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false);
  const [showName, setShowName] = useState(initial?.showName ?? false);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);

  const byId = new Map(choices.map((c) => [c.id, c]));
  const chosen = selected.map((id) => byId.get(id)).filter((c): c is SavedChoice => Boolean(c));
  const available = choices.filter((c) => !selected.includes(c.id));
  const full = selected.length >= LIST_MAX_PLACES;
  const enough = selected.length >= LIST_MIN_PLACES;

  const move = (index: number, by: -1 | 1) =>
    setSelected((current) => {
      const next = [...current];
      const target = index + by;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  async function save() {
    setBusy("save");
    try {
      const res = await fetch(initial ? `/api/my-lists/${initial.id}` : "/api/my-lists", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, blurb: blurb.trim() === "" ? null : blurb, experienceIds: selected, isPublic, showName: isPublic && showName }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "That did not save.");
      // COPY: said once a list is saved
      toast.success(isPublic ? "Saved. Anyone with the link can open it." : "Saved. It is private to you.");
      router.push("/lists");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not save.");
      setBusy(null);
    }
  }

  async function remove() {
    if (!initial) return;
    // COPY: asked before a list is deleted
    if (!window.confirm("Delete this list? Its link, if it has one, stops working.")) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/my-lists/${initial.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "That did not go through.");
      router.push("/lists");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not go through.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <div>
          {/* COPY: the labels and hints on the list editor */}
          <label htmlFor="list-title" className="mb-1.5 block text-sm font-medium text-foreground">
            Title
          </label>
          <Input id="list-title" value={title} maxLength={OWN_LIST_TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="Late-night study spots" />
        </div>
        <div>
          <label htmlFor="list-blurb" className="mb-1.5 block text-sm font-medium text-foreground">
            A line about it <span className="font-normal text-foreground-subtle">(optional)</span>
          </label>
          <Textarea id="list-blurb" value={blurb} maxLength={OWN_LIST_BLURB_MAX} onChange={(e) => setBlurb(e.target.value)} className="min-h-20" />
        </div>
      </div>

      <section aria-labelledby="list-places">
        <h2 id="list-places" className="font-display text-lg font-semibold text-foreground">
          Places
        </h2>
        <p className="mt-0.5 text-sm text-foreground-muted">
          Choose {LIST_MIN_PLACES} to {LIST_MAX_PLACES} of the places you have saved. The order here is the order of the list.
        </p>

        {chosen.length > 0 && (
          <ol className="mt-3 divide-y divide-border rounded-[var(--radius-md)] border border-border bg-surface">
            {chosen.map((c, i) => (
              <li key={c.id} className="flex items-center gap-2 px-3 py-2.5">
                <span aria-hidden className="font-reason w-5 shrink-0 text-lg text-foreground-subtle">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{c.title}</span>
                  {c.subtitle && <span className="block truncate text-xs text-foreground-muted">{c.subtitle}</span>}
                </span>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${c.title} up`} className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-sunken disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === chosen.length - 1} aria-label={`Move ${c.title} down`} className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-sunken disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setSelected((s) => s.filter((id) => id !== c.id))} aria-label={`Remove ${c.title}`} className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-sunken">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-2 text-xs text-foreground-subtle">
          {selected.length} of {LIST_MAX_PLACES}
          {!enough ? `, at least ${LIST_MIN_PLACES} needed` : ""}
        </p>

        <h3 className="mt-5 text-sm font-medium text-foreground">Your saved places</h3>
        {available.length === 0 ? (
          <p className="mt-2 text-sm text-foreground-muted">{choices.length === 0 ? "None of your saved places could be loaded just now." : "Every saved place is on this list."}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded-[var(--radius-md)] border border-border bg-surface">
            {available.map((c) => (
              <li key={c.id} className="flex items-center gap-2 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{c.title}</span>
                  {c.subtitle && <span className="block truncate text-xs text-foreground-muted">{c.subtitle}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => setSelected((s) => [...s, c.id])}
                  disabled={full}
                  aria-label={`Add ${c.title}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-sunken disabled:opacity-30"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <fieldset>
        {/* COPY: who can see a list, private unless chosen */}
        <legend className="font-display text-lg font-semibold text-foreground">Who can see it</legend>
        <div className="mt-3 space-y-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="radio" name="visibility" checked={!isPublic} onChange={() => setIsPublic(false)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
            <span>
              <span className="block text-sm font-medium text-foreground">Only me</span>
              <span className="block text-sm text-foreground-muted">Nobody else can open it.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="radio" name="visibility" checked={isPublic} onChange={() => setIsPublic(true)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
            <span>
              <span className="block text-sm font-medium text-foreground">Anyone with the link</span>
              <span className="block text-sm text-foreground-muted">It is not listed anywhere, and search engines are asked not to index it.</span>
            </span>
          </label>
          {isPublic && (
            <label className="ml-7 flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
              <span>
                <span className="block text-sm font-medium text-foreground">Show my first name on it{firstName ? ` (${firstName})` : ""}</span>
                <span className="block text-sm text-foreground-muted">Your first name only: never your surname or your email.</span>
              </span>
            </label>
          )}
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center gap-5 sm:justify-start">
          <Link href="/lists" className="text-sm text-foreground-muted hover:text-foreground">
            Cancel
          </Link>
          {initial && (
            <button type="button" onClick={remove} disabled={busy !== null} className="text-sm text-foreground-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50">
              Delete list
            </button>
          )}
        </div>
        <Button onClick={save} loading={busy === "save"} disabled={busy !== null || !enough || title.trim() === ""} className="w-full sm:w-auto">
          Save list
        </Button>
      </div>
    </div>
  );
}
