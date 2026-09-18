import { createAdminClient } from "@/lib/supabase/admin";

/**
 * All Digistore24 IPN business logic lives here, separate from the route
 * handler, mirroring src/lib/stripe/webhook-handlers.ts. DS24 sells Premium
 * through its own checkout (affiliates only get paid for purchases made
 * there, not through our Stripe checkout), so there is no Stripe customer
 * behind these subscriptions: stripe_customer_id/stripe_subscription_id/
 * stripe_price_id stay null, and digistore24_order_id is the stable anchor
 * instead.
 *
 * Every user already has exactly one subscriptions row before any purchase
 * happens — handle_new_user() (see schema.sql) creates it at signup, and
 * user_id is unique on that table. So this always UPDATEs the existing row
 * keyed by user_id, the same way the Stripe handler does; it never inserts.
 */

const REVOKING_EVENTS = new Set(["last_paid_day", "on_refund", "on_chargeback"]);

/** DS24 sends every value as a string (form-encoded POST). */
type Ipn = Record<string, string>;

export async function handleDigistore24Event(ipn: Ipn): Promise<void> {
  const event = ipn.event;
  if (!event || event === "connection_test") return;

  const orderId = ipn.order_id;
  if (!orderId) return;

  // Defense in depth: the DS24 dashboard's IPN connection is itself scoped
  // to just the Zolo Premium product, but if this account ever sells
  // something else through DS24 later and that scoping isn't (re)configured
  // carefully, this stops an unrelated product's sale from granting Zolo
  // Premium. Only enforced when configured, so this stays a no-op until
  // DIGISTORE24_PRODUCT_ID is actually set.
  const expectedProductId = process.env.DIGISTORE24_PRODUCT_ID;
  if (expectedProductId && ipn.product_id && ipn.product_id !== expectedProductId) {
    console.error("[digistore24] ignoring IPN for unexpected product", {
      order_id: orderId,
      product_id: ipn.product_id,
      expected: expectedProductId,
    });
    return;
  }

  const admin = createAdminClient();

  // Prefer the order's already-recorded owner (set the first time we saw
  // this order_id) over re-resolving by email — the buyer's Zolo account
  // email could change between IPN events for the same order, and this
  // avoids re-scanning/re-inviting in that case. Falls back to resolving
  // fresh for an order we haven't seen yet.
  const existing = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("digistore24_order_id", orderId)
    .maybeSingle();

  const userId = existing.data?.user_id ?? (await resolveUserId(admin, ipn));
  if (!userId) return;

  switch (event) {
    case "on_payment": {
      await admin
        .from("subscriptions")
        .update({
          digistore24_order_id: orderId,
          digistore24_manage_url: ipn.support_url || ipn.rebilling_stop_url || null,
          status: "active",
          plan_id: "premium",
          current_period_end: ipn.next_payment_at || null,
          cancel_at_period_end: false,
        })
        .eq("user_id", userId);
      await recordPayment(admin, userId, ipn, "paid");
      break;
    }
    // DS24's own guidance: use this to temporarily suspend access until a
    // successful payment comes in — a later on_payment for the same order
    // flips status back to "active" and restores access automatically.
    case "on_payment_missed": {
      await admin.from("subscriptions").update({ status: "past_due" }).eq("user_id", userId);
      break;
    }
    // Access stays live until last_paid_day — this only flags the
    // cancellation (drives the "Cancels at the end of your billing period"
    // copy subscription-card.tsx already shows for Stripe cancellations).
    case "on_rebill_cancelled": {
      await admin.from("subscriptions").update({ cancel_at_period_end: true }).eq("user_id", userId);
      break;
    }
    case "on_rebill_resumed": {
      await admin.from("subscriptions").update({ cancel_at_period_end: false }).eq("user_id", userId);
      break;
    }
    default: {
      // Events we intentionally don't act on beyond this point:
      // on_affiliation, eticket, custom form, payment_denial (no access was
      // ever granted to revoke), and any future event DS24 adds that we
      // don't recognize yet — always acknowledge, never fail on an unknown
      // event.
      if (REVOKING_EVENTS.has(event)) {
        await admin.from("subscriptions").update({ status: "canceled", plan_id: "free" }).eq("user_id", userId);
        if (event === "on_refund" || event === "on_chargeback") {
          await recordPayment(admin, userId, ipn, "refunded");
        }
      }
      break;
    }
  }
}

async function recordPayment(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  ipn: Ipn,
  status: "paid" | "refunded"
): Promise<void> {
  if (!ipn.transaction_id) return;
  await admin.from("payments").upsert(
    {
      user_id: userId,
      digistore24_transaction_id: ipn.transaction_id,
      amount: Number(ipn.amount_brutto || ipn.transaction_amount || 0),
      currency: (ipn.currency || ipn.transaction_currency || "usd").toLowerCase(),
      status,
    },
    { onConflict: "digistore24_transaction_id" }
  );
}

/**
 * Resolves the IPN to a Zolo user, in order:
 * 1. `custom` — if we sent the buyer to DS24 from an already-logged-in
 *    session (e.g. a future "buy via Digistore24" link on /profile/upgrade),
 *    it carries that user's real id. Verified against auth.users before
 *    trusting it, since it's an unauthenticated webhook field — a forged
 *    value just falls through to email resolution, it can't grant access
 *    without a real payment behind it either way.
 * 2. `email` — the common case: a stranger clicked an affiliate's DS24
 *    link, has no Zolo account yet. Reuses an existing account by email if
 *    one exists, otherwise creates one and sends a real invite email (same
 *    Resend SMTP already wired into Supabase Auth) so they can set a
 *    password and actually log in to use what they paid for.
 */
async function resolveUserId(admin: ReturnType<typeof createAdminClient>, ipn: Ipn): Promise<string | null> {
  if (ipn.custom && /^[0-9a-f-]{36}$/i.test(ipn.custom)) {
    const { data } = await admin.auth.admin.getUserById(ipn.custom);
    if (data?.user) return data.user.id;
  }

  const email = ipn.email?.trim().toLowerCase();
  if (!email) return null;

  // listUsers() has no email filter — fine at Zolo's current scale (a
  // handful of users total as of 2026-09), but this scan needs to become a
  // real indexed lookup if the user base grows large before Supabase adds
  // getUserByEmail to the JS client.
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) break;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 200) break;
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error || !data.user) {
    console.error("[digistore24] failed to create account for buyer:", error);
    return null;
  }
  return data.user.id;
}
