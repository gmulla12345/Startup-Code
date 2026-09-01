import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Subscription } from "@/types/database";

function rowToSubscription(row: Record<string, unknown>): Subscription {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    stripeCustomerId: row.stripe_customer_id as string | null,
    stripeSubscriptionId: row.stripe_subscription_id as string | null,
    stripePriceId: row.stripe_price_id as string | null,
    status: row.status as Subscription["status"],
    planId: row.plan_id as Subscription["planId"],
    currentPeriodEnd: row.current_period_end as string | null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Cached per request — see getProfileByUserId in repositories/profile.ts for why. */
export const getSubscription = cache(async function getSubscription(
  client: SupabaseClient,
  userId: string
): Promise<Subscription | null> {
  const { data, error } = await client
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToSubscription(data);
});

export function isPremium(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return subscription.planId === "premium" && ["active", "trialing"].includes(subscription.status);
}
