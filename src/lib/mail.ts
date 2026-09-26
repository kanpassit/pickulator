const FROM_ADDRESS = "Pickulator <no-reply@pickulator.com>";

export type SendEmailResult =
  | { sent: true }
  // Distinguishes "we tried Resend and it failed" from "Resend isn't
  // configured at all" so callers can decide how loudly to log each case -
  // see forgot-password/route.ts, which treats "not configured" as the
  // expected state until RESEND_API_KEY is set in Vercel, but treats a real
  // Resend failure as worth a louder error log.
  | { sent: false; reason: "not_configured" }
  | { sent: false; reason: "send_failed"; status: number; body: string };

/**
 * Sends one email via Resend's REST API directly with fetch() rather than
 * the `resend` npm package - this repo has no local Node toolchain able to
 * install a new dependency right now (see the branch/Vercel-preview-build
 * workflow used throughout this codebase's history), and the REST call
 * itself is a single POST, so the package would only save a few lines.
 *
 * Never throws: every caller (forgot-password today) needs to keep going
 * either way - a delivery failure shouldn't turn into a 500 for the person
 * requesting a reset, since the generic "if an account exists…" response
 * must go out regardless. See callers for what they log when this returns
 * something other than { sent: true } - in particular, none of them may
 * log the email body/reset URL itself.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, reason: "send_failed", status: res.status, body };
    }

    return { sent: true };
  } catch (err) {
    return { sent: false, reason: "send_failed", status: 0, body: String(err) };
  }
}

/**
 * Shared inline-styled email shell (brand color, serif wordmark) so every
 * transactional email looks like the same product. Keep this to inline
 * styles only - most email clients strip <style> blocks.
 */
export function emailShell(opts: { heading: string; bodyHtml: string }): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F7F2EA;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F2EA;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            <tr>
              <td style="text-align:center;padding-bottom:20px;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:bold;color:#1A1A1A;">Pickulator</span>
              </td>
            </tr>
            <tr>
              <td style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;color:#1A1A1A;padding-bottom:16px;">
                ${opts.heading}
              </td>
            </tr>
            <tr>
              <td style="font-size:15px;line-height:1.5;color:#4A4A4A;">
                ${opts.bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
