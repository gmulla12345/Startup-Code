import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/auth";
import { getTravelProvider } from "@/services/providers";

export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const provider = getTravelProvider();
    const destinations = q ? await provider.search(q) : await provider.listDestinations();
    return NextResponse.json({ destinations });
  });
}
