export interface ShareInput {
  title: string;
  text?: string;
  url: string;
}

/** Uses the native Web Share sheet on mobile; falls back to clipboard copy. */
export async function shareEntity(input: ShareInput): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(input);
      return "shared";
    } catch {
      // User cancelled or share failed — fall through to clipboard.
    }
  }

  try {
    await navigator.clipboard.writeText(input.url);
    return "copied";
  } catch {
    return "failed";
  }
}
