"use client";

import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { shareEntity } from "@/lib/utils/share";

/**
 * Turns the list on screen into a link. Pressing the button makes the link for this
 * kind of list (or updates the one the person already has, so it shows the places they
 * are looking at now), then shows it with three choices: send it, copy it, or turn it
 * off, which deletes it.
 *
 * What may be shared, and the limits, are enforced on the server in /api/lists; this
 * only sends the template's name and the place ids it was given.
 *
 * Native equivalent: the app calls the same /api/lists routes with its bearer token and
 * hands the returned url to the system share sheet.
 */
export function ShareListButton({ template, placeIds, title }: { template: string; placeIds: string[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // Closes on Escape or a click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  async function openPanel() {
    setOpen(true);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, placeIds }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
      setLink(json.link);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!link) return;
    const result = await shareEntity({ title, url: link.url });
    if (result === "copied") toast.success("Link copied");
    else if (result === "failed") toast.error("Couldn't share the link. Copy it from the box instead.");
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link. Select it in the box instead.");
    }
  }

  async function turnOff() {
    if (!link) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/lists/${link.token}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLink(null);
      setOpen(false);
      toast.success("Link turned off");
    } catch {
      toast.error("Couldn't turn the link off. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={root} className="relative shrink-0">
      <Button variant="ghost" size="sm" onClick={openPanel} aria-label={`Share the list ${title}`}>
        <Share2 className="h-4 w-4" /> Share
      </Button>

      {open && (
        <div role="dialog" aria-label="Share this list" className="absolute right-0 z-20 mt-2 w-72 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-raised)]">
          {error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : !link ? (
            <p className="text-sm text-foreground-muted">Making your link...</p>
          ) : (
            <div className="space-y-3">
              {/* COPY: what the share panel says about a list link */}
              <p className="text-sm text-foreground-muted">Anyone with this link can see this list. No name, no account.</p>
              <input
                readOnly
                value={link.url}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Link to this list"
                className="w-full rounded-[var(--radius-sm)] border border-border bg-surface-sunken px-3 py-2 text-xs text-foreground"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={send} disabled={busy} className="flex-1">
                  Send
                </Button>
                <Button size="sm" variant="outline" onClick={copy} disabled={busy} className="flex-1">
                  Copy link
                </Button>
              </div>
              <button onClick={turnOff} disabled={busy} className="text-xs text-foreground-muted underline underline-offset-4 hover:text-foreground">
                Turn off this link
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
