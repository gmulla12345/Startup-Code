import type { ReactNode } from "react";

/**
 * A floating browser-window chrome (traffic-light dots + address bar) around
 * real product content -- the actual "here's the product" visual moment the
 * reference sites (Linear especially) lead with, that this page didn't have
 * anywhere before. Deliberately not a screenshot image (which would go
 * stale the moment the real UI changes) -- it's live-rendered markup using
 * the same tokens/components as the real app, so it can never drift out of
 * sync with what Discover actually looks like.
 */
export function BrowserFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-xl)] border border-white/10 bg-[#1c1914] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden ${className ?? ""}`}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#14120f]">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="rounded-full bg-white/5 px-4 py-1 text-[11px] text-[#8a8071] max-w-[220px] truncate">
            discoverzolo.com/discover
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
