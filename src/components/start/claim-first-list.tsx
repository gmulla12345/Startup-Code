"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { clearFirstList, readFirstList } from "@/lib/start/storage";

/**
 * Keeps a visitor's first list once they have an account: the first time a signed-in
 * page loads in the browser that holds one, its places are saved to the account (see
 * /api/start/claim) and the browser forgets the list. Mounted in the signed-in shell,
 * so it runs after signup and onboarding, or after a login, whichever comes first.
 *
 * It renders nothing. If the list cannot be kept this time (offline, an error) it is
 * left where it is and tried again on the next page; a list the server refuses as
 * malformed is dropped, because trying again cannot help.
 *
 * Native equivalent: after signup, send the same picks to /api/start/claim.
 */
export function ClaimFirstList() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const stored = readFirstList();
    if (!stored) return;

    (async () => {
      try {
        const res = await fetch("/api/start/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ picks: stored.picks }),
        });
        if (res.ok) {
          clearFirstList();
          // COPY: shown once, when a first list has been kept in the new account
          toast.success("Kept. Your first list is in Saved.");
        } else if (res.status === 400) {
          clearFirstList();
        }
      } catch {
        /* tried again on the next page */
      }
    })();
  }, []);

  return null;
}
