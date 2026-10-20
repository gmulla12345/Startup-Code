"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/subscription/format";

type Action = "student" | "pause" | "cancel";

/**
 * The one screen between a Premium subscriber and cancelling. It says plainly what cancelling does, offers the
 * smaller alternatives that apply to this person, and ends with the one button that cancels. No second
 * confirmation, no reasons asked, nothing to dismiss: each choice is one click, and the server does the rest.
 */
export function CancelScreen({
  endsOn,
  student,
  pause,
  studentPrice,
}: {
  /** The end of the paid period (ISO), when Premium stops if cancelled. */
  endsOn: string | null;
  /** Offer the move to the Student price. */
  student: boolean;
  /** Offer a one-month pause. */
  pause: boolean;
  studentPrice: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const ends = formatDay(endsOn);

  async function run(action: Action) {
    setBusy(action);
    try {
      const res = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "That did not go through.");
      // COPY: what is said once a choice is made
      if (action === "cancel") toast.success(`Premium ends on ${formatDay(json.endsOn ?? endsOn)}. Everything you saved stays.`);
      else if (action === "pause") toast.success(`Paused. Premium returns on ${formatDay(json.until)}.`);
      else toast.success(`You are on the Student plan. Your next payment is $${json.priceMonthly ?? studentPrice}.`);
      router.push("/profile");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not go through.");
      setBusy(null);
    }
  }

  const anyBusy = busy !== null;
  const alternatives = student || pause;

  return (
    <div className="space-y-8">
      <div>
        {/* COPY: the cancel screen's heading and what cancelling does */}
        <h1 className="font-display text-3xl font-semibold text-foreground mb-3">Cancel Premium</h1>
        <p className="text-foreground-muted leading-relaxed">
          Premium stays with you until {ends}. After that your account moves to Free, and every place and list you have
          saved stays exactly where it is.
        </p>
      </div>

      {alternatives && (
        <div className="space-y-3">
          {/* COPY: the line above the smaller alternatives */}
          <p className="text-sm text-foreground-muted">If one of these suits you better:</p>

          {student && (
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
              {/* COPY: the Student plan, offered instead of cancelling */}
              <h2 className="font-display text-lg font-semibold text-foreground mb-1">Switch to Student</h2>
              <p className="text-sm text-foreground-muted mb-4">
                Everything in Premium for ${studentPrice} a month, from your next payment. The rate holds for as long as you stay.
              </p>
              <Button variant="outline" onClick={() => run("student")} loading={busy === "student"} disabled={anyBusy} className="w-full sm:w-auto">
                Switch to Student
              </Button>
            </div>
          )}

          {pause && (
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
              {/* COPY: pausing for a month, offered instead of cancelling */}
              <h2 className="font-display text-lg font-semibold text-foreground mb-1">Pause for a month</h2>
              <p className="text-sm text-foreground-muted mb-4">
                Premium continues until {ends}. The month after costs nothing and rests on Free, and Premium returns on its own.
              </p>
              <Button variant="outline" onClick={() => run("pause")} loading={busy === "pause"} disabled={anyBusy} className="w-full sm:w-auto">
                Pause for a month
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        {/* COPY: the way back, and the one button that cancels */}
        <Link href="/profile" className="text-sm text-foreground-muted hover:text-foreground text-center sm:text-left">
          Keep Premium
        </Link>
        <Button variant="outline" onClick={() => run("cancel")} loading={busy === "cancel"} disabled={anyBusy} className="w-full sm:w-auto">
          Cancel Premium
        </Button>
      </div>
    </div>
  );
}
