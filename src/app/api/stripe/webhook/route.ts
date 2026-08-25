import { NextResponse } from "next/server";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe/client";
import { handleStripeEvent } from "@/lib/stripe/webhook-handlers";

/**
 * Stripe webhook endpoint. Signature verification is mandatory — never
 * trust an unverified payload. This route is excluded from the auth
 * middleware matcher (see src/middleware.ts) since Stripe can't carry
 * Supabase session cookies.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhooks not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripeClient();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error("[stripe webhook] handler failed:", err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
