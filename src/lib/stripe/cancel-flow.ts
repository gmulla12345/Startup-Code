import type Stripe from "stripe";
import { ApiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStudentPlanConfigured, isStudentPriceId, pricing, studentPricing, studentPriceId } from "@/lib/config/pricing";
import { releaseFoundingSlot, reserveFoundingSlot } from "@/lib/founding/offer";
import {
  pauseState,
  PAUSE_META_FROM,
  PAUSE_META_UNTIL,
  PAUSE_MIN_LEAD_SECONDS,
  planPause,
  readPauseMetadata,
} from "@/lib/subscription/pause";
import type { Subscription } from "@/types/database";
import { getStripeClient } from "./client";
import { assertVerifiedStudent, STUDENT_PLAN_MESSAGES } from "./student-plan";
import { upsertSubscriptionRow } from "./webhook-handlers";

/**
 * What a Premium subscriber can do instead of cancelling, and cancelling itself. One calm screen
 * (/profile/cancel) offers the smaller alternatives; this is the server side of each, and the rules for
 * who is offered what. The browser only names an action; everything is checked here, against the stored
 * subscription and Stripe's own copy of it.
 *
 *   student   move a monthly Premium subscription to the Student price (verified school email, spot free)
 *   pause     skip one month: Premium continues to the end of the paid period, the month after is free and
 *             rests on Free, then billing resumes on its own (see lib/subscription/pause.ts)
 *   cancel    end it at the end of the paid period; the account is Free after, and keeps everything saved
 *   keep      take back a cancellation, before it takes effect
 *   unpause   take back a pause, before it begins
 *
 * Premium sold through Digistore24 has no Stripe subscription and is managed there; none of this applies.
 */

export const CANCEL_FLOW_MESSAGES = {
  none: "There is no Premium subscription to change.",
  elsewhere: "This subscription is managed through Digistore24.",
  notLive: "Your subscription is not active, so there is nothing to change here.",
  alreadyEnding: "Your subscription already ends at the close of the period you have paid for.",
  notEnding: "Your subscription is not set to end.",
  studentMonthly: "The student price is for monthly Premium.",
  studentOther: "Your subscription cannot move to the student price right now.",
  pauseMonthly: "A pause is for monthly subscriptions.",
  pauseAfterPayment: "A pause can be set once your first payment has been taken.",
  pauseTooLate: "A pause cannot be set when your next payment is about to be taken. Try again afterwards.",
  alreadyPaused: "Your subscription is already paused.",
  noPause: "There is no pause to undo.",
} as const;

const LIVE = ["active", "trialing"];

export interface CancelOptions {
  /** The end of the paid period, when Premium stops if cancelled. */
  endsOn: string | null;
  /** Move to the Student price. */
  student: boolean;
  /** Pause for a month. */
  pause: boolean;
}

/** Whether a stored row is a Stripe-backed Premium subscription this flow can act on. */
export function isManageableHere(sub: Subscription | null): sub is Subscription {
  return Boolean(sub && sub.stripeSubscriptionId && !sub.digistore24OrderId && sub.planId === "premium" && LIVE.includes(sub.status));
}

/**
 * Which smaller alternatives to offer. Pure: the facts come in. The server checks each again when it is chosen.
 * The student price is offered only to a monthly Premium subscriber with a verified school email, while the plan
 * is on sale and has a spot; a pause only to a subscriber who has paid and is billed monthly.
 */
export function cancelOptions(input: {
  subscription: Subscription | null;
  eduVerified: boolean;
  studentOnSale: boolean;
  studentOpen: boolean;
  now?: Date;
}): CancelOptions {
  const sub = input.subscription;
  if (!isManageableHere(sub)) return { endsOn: null, student: false, pause: false };
  const now = input.now ?? new Date();
  const idle = !sub.cancelAtPeriodEnd && pauseState(sub, now) === "none";
  const endsAt = sub.currentPeriodEnd ? Date.parse(sub.currentPeriodEnd) : NaN;

  const student =
    idle &&
    input.studentOnSale &&
    input.studentOpen &&
    input.eduVerified &&
    sub.stripePriceId !== null &&
    sub.stripePriceId === pricing.premium.priceId &&
    !isStudentPriceId(sub.stripePriceId);

  const monthly = sub.stripePriceId !== null && (sub.stripePriceId === pricing.premium.priceId || isStudentPriceId(sub.stripePriceId));
  const pause =
    idle &&
    sub.status === "active" &&
    monthly &&
    Number.isFinite(endsAt) &&
    (endsAt - now.getTime()) / 1000 >= PAUSE_MIN_LEAD_SECONDS;

  return { endsOn: sub.currentPeriodEnd, student, pause };
}

interface Live {
  stripe: Stripe;
  sub: Stripe.Subscription;
  item: Stripe.SubscriptionItem;
}

/** The person's Stripe subscription, fetched fresh (Stripe is the source of truth), or an ApiError with words fit to show. */
async function loadLive(userId: string): Promise<Live> {
  const { data, error } = await createAdminClient()
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id, digistore24_order_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`[cancel-flow] could not read the subscription: ${error.message}`);
  if (!data) throw new ApiError(404, CANCEL_FLOW_MESSAGES.none);
  if (!data.stripe_subscription_id) {
    throw new ApiError(data.digistore24_order_id ? 400 : 404, data.digistore24_order_id ? CANCEL_FLOW_MESSAGES.elsewhere : CANCEL_FLOW_MESSAGES.none);
  }

  const stripe = getStripeClient();
  const sub = await stripe.subscriptions.retrieve(data.stripe_subscription_id);
  // Whatever the stored row says, the subscription must be this person's own.
  if (!data.stripe_customer_id || sub.customer !== data.stripe_customer_id) throw new ApiError(404, CANCEL_FLOW_MESSAGES.none);
  if (!LIVE.includes(sub.status)) throw new ApiError(409, CANCEL_FLOW_MESSAGES.notLive);
  const item = sub.items.data[0];
  if (!item) throw new ApiError(404, CANCEL_FLOW_MESSAGES.none);
  return { stripe, sub, item };
}

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();

/** Parameters that remove a pause that has not begun (Stripe: an empty string unsets a field or a metadata key). */
const CLEAR_PAUSE = { pause_collection: "", metadata: { [PAUSE_META_FROM]: "", [PAUSE_META_UNTIL]: "" } } as const;

/** Move a monthly Premium subscription to the Student price, from the next payment (no refund and no extra charge today). */
export async function switchToStudent(userId: string): Promise<{ priceMonthly: number }> {
  if (!isStudentPlanConfigured()) throw new ApiError(503, STUDENT_PLAN_MESSAGES.unavailable);
  await assertVerifiedStudent(userId);
  const { stripe, sub, item } = await loadLive(userId);

  if (sub.cancel_at_period_end || sub.pause_collection) throw new ApiError(409, CANCEL_FLOW_MESSAGES.studentOther);
  if (item.price.id === studentPriceId()) throw new ApiError(409, CANCEL_FLOW_MESSAGES.studentOther);
  if (item.price.id !== pricing.premium.priceId) throw new ApiError(409, CANCEL_FLOW_MESSAGES.studentMonthly);

  // The student price may have a limit: hold a spot while the change is made (throws, and changes nothing, if it is full).
  await reserveFoundingSlot(userId);
  let updated: Stripe.Subscription;
  try {
    updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, price: studentPriceId() }],
      // The period already paid stays as it is; the new price applies from the next invoice.
      proration_behavior: "none",
      metadata: { plan: "student" },
    });
  } catch (error) {
    await releaseFoundingSlot(userId);
    throw error;
  }
  await upsertSubscriptionRow(userId, updated); // also turns the held spot into the subscription's own
  return { priceMonthly: studentPricing.priceMonthly };
}

/** Skip one month: Premium continues to the end of the paid period, the month after is free and rests on Free, then billing resumes. */
export async function pauseForMonth(userId: string): Promise<{ from: string; until: string }> {
  const { stripe, sub, item } = await loadLive(userId);

  if (sub.status !== "active") throw new ApiError(409, CANCEL_FLOW_MESSAGES.pauseAfterPayment);
  if (sub.cancel_at_period_end) throw new ApiError(409, CANCEL_FLOW_MESSAGES.alreadyEnding);
  if (sub.pause_collection || pauseState(readPauseMetadata(sub.metadata)) !== "none") throw new ApiError(409, CANCEL_FLOW_MESSAGES.alreadyPaused);
  if (item.price.recurring?.interval !== "month" || (item.price.recurring?.interval_count ?? 1) !== 1) throw new ApiError(409, CANCEL_FLOW_MESSAGES.pauseMonthly);

  const plan = planPause({ currentPeriodEnd: item.current_period_end, billingCycleAnchor: sub.billing_cycle_anchor });
  if (!plan) throw new ApiError(409, CANCEL_FLOW_MESSAGES.pauseTooLate);

  const from = iso(plan.from);
  const until = iso(plan.until);
  const updated = await stripe.subscriptions.update(sub.id, {
    // "void": the invoice for the skipped month is voided, never collected. Collection resumes just before that month ends.
    pause_collection: { behavior: "void", resumes_at: plan.resumesAt },
    metadata: { [PAUSE_META_FROM]: from, [PAUSE_META_UNTIL]: until },
  });
  await upsertSubscriptionRow(userId, updated);
  return { from, until };
}

/** Take back a pause that has not begun yet. */
export async function undoPause(userId: string): Promise<void> {
  const { stripe, sub } = await loadLive(userId);
  if (!sub.pause_collection || pauseState(readPauseMetadata(sub.metadata)) !== "scheduled") throw new ApiError(409, CANCEL_FLOW_MESSAGES.noPause);
  const updated = await stripe.subscriptions.update(sub.id, { ...CLEAR_PAUSE });
  await upsertSubscriptionRow(userId, updated);
}

/** End the subscription at the close of the paid period. The account is Free after; nothing saved is touched. */
export async function cancelAtPeriodEnd(userId: string): Promise<{ endsOn: string }> {
  const { stripe, sub, item } = await loadLive(userId);
  if (sub.cancel_at_period_end) throw new ApiError(409, CANCEL_FLOW_MESSAGES.alreadyEnding);

  // A pause that has not begun is dropped with it (there is nothing left to pause). One already under way ends with the subscription.
  const dropPause = Boolean(sub.pause_collection) && pauseState(readPauseMetadata(sub.metadata)) === "scheduled";
  const updated = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true, ...(dropPause ? CLEAR_PAUSE : {}) });
  await upsertSubscriptionRow(userId, updated);
  return { endsOn: iso(item.current_period_end) };
}

/** Take back a cancellation before it takes effect. */
export async function keepPremium(userId: string): Promise<void> {
  const { stripe, sub } = await loadLive(userId);
  if (!sub.cancel_at_period_end) throw new ApiError(409, CANCEL_FLOW_MESSAGES.notEnding);
  const updated = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
  await upsertSubscriptionRow(userId, updated);
}
