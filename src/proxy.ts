import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { captureAttribution } from "@/lib/attribution-cookie";

// Next.js 16 renamed Middleware to Proxy (same functionality, new file name
// and export). See node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  // Remember ?src= / ?code= from a campaign link (see lib/attribution.ts).
  captureAttribution(request, response);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/digistore24/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
