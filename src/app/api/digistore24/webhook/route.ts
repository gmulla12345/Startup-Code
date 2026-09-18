import { isDigistore24Configured } from "@/lib/digistore24/client";
import { verifyDigistore24Signature } from "@/lib/digistore24/signature";
import { handleDigistore24Event } from "@/lib/digistore24/webhook-handlers";

/**
 * Digistore24 IPN endpoint. Signature verification is mandatory — never
 * trust an unverified payload (see signature.ts). This route is excluded
 * from the auth proxy matcher (see src/proxy.ts) since DS24 can't carry
 * Supabase session cookies, same reason the Stripe webhook is excluded.
 *
 * DS24 expects a plain-text "OK" response on success — anything else (or a
 * non-2xx status) is treated as a failure and gets retried/flagged in their
 * IPN log. See https://dev.digistore24.com/hc/en-us/articles/32480217565969.
 */
export async function POST(request: Request) {
  const passphrase = process.env.DIGISTORE24_IPN_PASSPHRASE;
  if (!isDigistore24Configured() || !passphrase) {
    return new Response("ERROR: not configured", { status: 503 });
  }

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }

  if (params.event === "connection_test") {
    return new Response("OK", { status: 200 });
  }

  if (!verifyDigistore24Signature(passphrase, params)) {
    console.error("[digistore24 webhook] signature verification failed", { order_id: params.order_id });
    return new Response("ERROR: invalid signature", { status: 400 });
  }

  try {
    await handleDigistore24Event(params);
  } catch (err) {
    console.error("[digistore24 webhook] handler failed:", err);
    return new Response("ERROR: handler failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
