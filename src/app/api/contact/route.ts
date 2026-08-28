import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { contactMessageSchema } from "@/lib/validation/schemas";
import { sendEmail } from "@/lib/email/send";
import { brand } from "@/lib/config/brand";

/** Public endpoint — no auth required to send a contact message. */
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    checkRateLimit(`contact:${ip}`, 5, 60_000);

    const body = contactMessageSchema.parse(await request.json());

    await sendEmail({
      to: brand.supportEmail,
      from: `${brand.name} Contact Form <${brand.supportEmail}>`,
      replyTo: body.email,
      subject: `New contact form message from ${body.name}`,
      html: `<p><strong>From:</strong> ${body.name} (${body.email})</p><p>${body.message.replace(/\n/g, "<br>")}</p>`,
    });

    return NextResponse.json({ ok: true });
  });
}
