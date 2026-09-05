import { NextResponse } from "next/server";
import { withErrorHandling, ApiError } from "@/lib/api/auth";
import { getExperienceProvider } from "@/services/providers";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await context.params;
    const provider = await getExperienceProvider();

    const experience = (await provider.getBySlug(id)) ?? (await provider.getById(id));
    if (!experience) throw new ApiError(404, "Experience not found.");

    const related = await provider.getRelated(experience, 4);
    return NextResponse.json({ experience, related });
  });
}
