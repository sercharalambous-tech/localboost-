import * as postmark from "@postmark/postmark";

let _client: postmark.ServerClient | null = null;

export function getPostmarkClient(): postmark.ServerClient {
  if (!_client) {
    _client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN!);
  }
  return _client;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  tag?: string;
}

/**
 * Send a transactional email via Postmark.
 * Returns the message ID or throws on failure.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<string> {
  // Test mode – skip real send
  if (process.env.TEST_MODE === "true") {
    console.log(`[TEST_MODE] Email to ${opts.to}: "${opts.subject}"`);
    return `test_${Date.now()}`;
  }

  const client = getPostmarkClient();
  const result = await client.sendEmail({
    From: `${process.env.POSTMARK_FROM_NAME} <${process.env.POSTMARK_FROM_EMAIL}>`,
    To: opts.to,
    Subject: opts.subject,
    HtmlBody: opts.htmlBody,
    TextBody: opts.textBody ?? stripHtml(opts.htmlBody),
    Tag: opts.tag ?? "transactional",
    TrackOpens: false,
    TrackLinks: "None",
    MessageStream: "outbound",
  });
  return result.MessageID;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/** Generate an unsubscribe URL for email opt-outs */
export function buildUnsubscribeUrl(token: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/email-unsubscribe/${token}`;
}
