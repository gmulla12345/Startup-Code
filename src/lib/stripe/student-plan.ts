import { ApiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Who may buy the Student plan: an account with a verified school email. The browser
 * only ever names the plan; the price id is chosen on the server, and this check runs
 * there first, so the student price cannot be reached by an account that is not one.
 * Verification is the database's own (profiles.edu_verified_at, set when a school
 * address is confirmed), the same fact the student promo codes rely on.
 */

export const STUDENT_PLAN_MESSAGES = {
  unavailable: "The student price is not available yet.",
  monthlyOnly: "The student price is monthly. Choose monthly to use it.",
  notVerified: "The student price is for verified school email addresses. Confirm yours from the link we sent, then try again.",
  full: "The founding student rate is full.",
} as const;

/** Throws an ApiError, with words fit to show the person, unless this account has a verified school email. Fails closed. */
export async function assertVerifiedStudent(userId: string): Promise<void> {
  const { data, error } = await createAdminClient().from("profiles").select("edu_verified_at").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`[student-plan] could not check the school email: ${error.message}`);
  if (!data?.edu_verified_at) throw new ApiError(403, STUDENT_PLAN_MESSAGES.notVerified);
}
