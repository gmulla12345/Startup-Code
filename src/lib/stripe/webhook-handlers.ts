import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/types/database";

/**
 * All Stripe webhook business logic lives here, separate from the route
 * handler, so it can be unit-tested without spinning up a request.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId || !session.subscription) return;
      await syncSubscriptionFromStripe(userId, session.subscription as string);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId ?? (await findUserIdByCustomer(subscription.customer as string));
      if (!userId) return;
      await upsertSubscriptionRow(userId, subscription);
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const userId = await findUserIdByCustomer(customerId);
      if (!userId) return;
      const admin = createAdminClient();
      // Upsert on stripe_invoice_id — Stripe retries webhook deliveries on
      // any non-2xx response or timeout, so this must be safe to run twice
      // for the same event without creating a duplicate billing history row.
      await admin.from("payments").upsert(
        {
          user_id: userId,
          stripe_invoice_id: invoice.id,
          amount: (invoice.amount_paid || invoice.amount_due) / 100,
          currency: invoice.currency,
          status: event.type === "invoice.paid" ? "paid" : "failed",
        },
        { onConflict: "stripe_invoice_id" }
      );
      break;
    }
    default:
      break;
  }
}

async function findUserIdByCustomer(customerId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function syncSubscriptionFromStripe(userId: string, subscriptionId: string): Promise<void> {
  const { getStripeClient } = await import("./client");
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscriptionRow(userId, subscription);
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const known: SubscriptionStatus[] = [
    "active",
    "trialing",
    "past_due",
    "canceled",
    "incomplete",
    "incomplete_expired",
    "unpaid",
  ];
  return (known as string[]).includes(status) ? (status as SubscriptionStatus) : "none";
}

async function upsertSubscriptionRow(userId: string, subscription: Stripe.Subscription): Promise<void> {
  const admin = createAdminClient();
  const item = subscription.items.data[0];

  await admin
    .from("subscriptions")
    .update({
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: item?.price.id ?? null,
      status: mapStripeStatus(subscription.status),
      plan_id: ["active", "trialing"].includes(subscription.status) ? "premium" : "free",
      current_period_end: item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq("user_id", userId);
}
