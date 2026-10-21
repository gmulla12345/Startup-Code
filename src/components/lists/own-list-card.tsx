"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface OwnListSummary {
  id: string;
  title: string;
  blurb: string | null;
  count: number;
  isPublic: boolean;
  showName: boolean;
  /** The full address, only while the list is public. */
  url: string | null;
}

/** One of your lists, as listed on your lists page: who can see it, its link when it has one, and what you can do with it. */
export function OwnListCard({ list }: { list: OwnListSummary }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function copy() {
    if (!list.url) return;
    try {
      await navigator.clipboard.writeText(list.url);
      // COPY: said once a list's link is copied
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy the link. Select it and copy it by hand.");
    }
  }

  async function remove() {
    // COPY: asked before a list is deleted
    if (!window.confirm("Delete this list? Its link, if it has one, stops working.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/my-lists/${list.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "That did not go through.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not go through.");
      setBusy(false);
    }
  }

  return (
    <li className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold leading-snug text-foreground">{list.title}</h2>
          {list.blurb && <p className="mt-0.5 text-sm text-foreground-muted">{list.blurb}</p>}
          <p className="mt-1.5 text-xs text-foreground-subtle">
            {/* COPY: how many places, and who can see a list */}
            {list.count} places · {list.isPublic ? (list.showName ? "Anyone with the link, with your first name" : "Anyone with the link") : "Only you"}
          </p>
        </div>
        <Link href={`/lists/${list.id}`} className="shrink-0 text-sm text-foreground-muted underline-offset-4 hover:text-foreground hover:underline">
          Edit
        </Link>
      </div>

      {list.url && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input readOnly value={list.url} aria-label="Link to this list" onFocus={(e) => e.currentTarget.select()} className="h-10 min-w-0 flex-1 rounded-[var(--radius-md)] border border-border bg-surface-sunken px-3 text-xs text-foreground-muted" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copy}>
              Copy link
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={list.url} target="_blank" rel="noopener noreferrer">
                Open
              </a>
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3 text-right">
        <button type="button" onClick={remove} disabled={busy} className="text-xs text-foreground-subtle underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50">
          Delete
        </button>
      </div>
    </li>
  );
}
