/**
 * Sends transactional email via Resend's HTTP API directly (no SDK
 * dependency needed for a single call site). Returns silently if
 * RESEND_API_KEY isn't configured — callers shouldn't fail the request
 * just because outbound email isn't set up yet.
 */
export async function sendEmail(params: { to: string; from: string; subject: string; html: string; replyTo?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false as const };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: params.to,
      from: params.from,
      subject: params.subject,
      html: params.html,
      reply_to: params.replyTo,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error (${res.status}): ${text}`);
  }

  return { sent: true as const };
}
