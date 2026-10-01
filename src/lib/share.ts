export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * Opens the OS share sheet (Web Share API) when available - the point being
 * "text this to the group chat" in one tap on a phone - and falls back to
 * copying the URL to the clipboard everywhere else. Dismissing the share
 * sheet isn't an error, so it's reported as "cancelled".
 */
export async function shareOrCopy(data: { title: string; text: string; url: string }): Promise<ShareOutcome> {
  if (canNativeShare()) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // Any other failure: fall through and try the clipboard instead.
    }
  }
  try {
    await navigator.clipboard.writeText(data.url);
    return "copied";
  } catch {
    return "failed";
  }
}
