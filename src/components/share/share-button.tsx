"use client";

import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { SHARE_NOTE_MAX } from "@/lib/config/share";
import { shareEntity } from "@/lib/utils/share";

/**
 * Share a place or a plan as a link. A small panel opens from the button: add a
 * note if you like, choose whether your first name appears (it does not unless you
 * tick the box), make the link, and copy or send it. If you already have a link for
 * this, the panel shows it, lets you change the note or the name, and lets you turn
 * the link off, which deletes it.
 *
 * All the rules (who may share what, what a note may hold, the limits) are enforced
 * on the server in /api/shares; this only collects what the person chose.
 *
 * Native equivalent: the app calls the same /api/shares routes with its bearer
 * token and hands the returned url to the system share sheet.
 */

export type ShareTarget = { kind: "place"; experienceId: string } | { kind: "plan"; itineraryId: string };

interface Link {
  token: string;
  url: string;
  note: string | null;
  showName: boolean;
}

const noun = (target: ShareTarget) => (target.kind === "place" ? "place" : "plan");

function query(target: ShareTarget): string {
  return target.kind === "place"
    ? `kind=place&experienceId=${encodeURIComponent(target.experienceId)}`
    : `kind=plan&itineraryId=${encodeURIComponent(target.itineraryId)}`;
}

export function ShareButton({
  target,
  shareTitle,
  label,
  variant = "outline",
  size = "icon",
  onNeedLogin,
  onCreated,
}: {
  target: ShareTarget;
  /** The title handed to the system share sheet. */
  shareTitle: string;
  /** Visible text beside the icon; omit for an icon-only button. */
  label?: string;
  variant?: "outline" | "ghost";
  size?: "icon" | "sm";
  /** If set, called instead of opening when the visitor is not signed in. */
  onNeedLogin?: () => void;
  /** Called once when a new link is made. */
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [link, setLink] = useState<Link | null>(null);
  const [note, setNote] = useState("");
  const [showName, setShowName] = useState(false);
  const [busy, setBusy] = useState(false);
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

  // The first time the panel opens, find out whether there is already a link.
  async function openPanel() {
    if (onNeedLogin) {
      onNeedLogin();
      return;
    }
    setOpen(true);
    if (loaded) return;
    try {
      const res = await fetch(`/api/shares?${query(target)}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.link) {
        setLink(json.link);
        setNote(json.link.note ?? "");
        setShowName(Boolean(json.link.showName));
      }
    } catch {
      /* the panel still works for making a new link */
    }
    setLoaded(true);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, note: note.trim() || null, showName }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
      const created = res.status === 201;
      setLink(json.link);
      if (created) onCreated?.();
      else toast.success("Link updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (!link) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/shares/${link.token}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Something went wrong. Please try again.");
      setLink(null);
      setNote("");
      setShowName(false);
      toast.success("Link turned off.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  async function send() {
    if (!link) return;
    const result = await shareEntity({ title: shareTitle, url: link.url });
    if (result === "copied") toast.success("Link copied.");
    if (result === "failed") toast.error("Could not copy the link.");
  }

  return (
    <div ref={root} className="relative">
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={label ? undefined : "Share"}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Share2 className="h-4 w-4" />
        {label}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label={`Share this ${noun(target)}`}
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-[var(--radius-lg)] border border-border bg-surface p-4 text-left shadow-[var(--shadow-card)]"
        >
          <h2 className="font-display text-lg font-semibold text-foreground">Share this {noun(target)}</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Anyone with the link can see it. You can turn the link off at any time.
          </p>

          <div className="mt-4">
            <label htmlFor="share-note" className="mb-1.5 block text-sm font-medium text-foreground">
              A note (optional)
            </label>
            <Textarea
              id="share-note"
              className="min-h-20"
              maxLength={SHARE_NOTE_MAX}
              placeholder="Why you would go"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="mt-1 text-xs text-foreground-subtle">
              {note.length} of {SHARE_NOTE_MAX}
            </p>
          </div>

          <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--ember)]"
              checked={showName}
              onChange={(e) => setShowName(e.target.checked)}
            />
            <span>
              Show my first name
              <span className="block text-xs text-foreground-subtle">Your name stays hidden unless you tick this.</span>
            </span>
          </label>

          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="button" size="sm" className="mt-4 w-full" onClick={save} loading={busy}>
            {link ? "Update link" : "Create link"}
          </Button>

          {link && (
            <div className="mt-4 border-t border-border pt-4">
              <label htmlFor="share-url" className="mb-1.5 block text-sm font-medium text-foreground">
                Your link
              </label>
              <input
                id="share-url"
                readOnly
                value={link.url}
                onFocus={(e) => e.currentTarget.select()}
                className="h-10 w-full rounded-[var(--radius-md)] border border-border-strong bg-surface-sunken px-3 text-sm text-foreground"
              />
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" variant="outline" className="flex-1" onClick={copy}>
                  Copy link
                </Button>
                <Button type="button" size="sm" variant="outline" className="flex-1" onClick={send}>
                  Send
                </Button>
              </div>
              <button
                type="button"
                onClick={turnOff}
                disabled={busy}
                className="mt-3 text-sm text-foreground-muted underline underline-offset-4 hover:text-foreground disabled:opacity-50"
              >
                Turn off this link
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
