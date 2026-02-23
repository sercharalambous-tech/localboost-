import twilio from "twilio";

let _client: twilio.Twilio | null = null;

export function getTwilioClient(): twilio.Twilio {
  if (!_client) {
    _client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }
  return _client;
}

export const SMS_FOOTER = "\nSTOP to opt out.";

/**
 * Send an SMS via Twilio.
 * Returns the message SID or throws on failure.
 */
export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<string> {
  // Test mode – skip real send
  if (process.env.TEST_MODE === "true") {
    console.log(`[TEST_MODE] SMS to ${to}: ${body}`);
    return `test_${Date.now()}`;
  }

  const client = getTwilioClient();
  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_FROM_NUMBER!,
    to,
  });
  return message.sid;
}

/**
 * Validate Twilio webhook signature (for inbound SMS webhook).
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (process.env.TEST_MODE === "true") return true;
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    params
  );
}

/**
 * Parse inbound Twilio SMS to detect opt-out keywords.
 */
export function isOptOutMessage(body: string): boolean {
  const normalized = body.trim().toUpperCase();
  return ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(normalized);
}
