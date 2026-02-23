import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isOptOutMessage, validateTwilioSignature } from "@/lib/twilio";
import { createAuditLog } from "@/lib/audit";

// Rate limit simple in-memory store (per-process; use Redis in production)
const recentRequests = new Map<string, number>();

export async function POST(req: NextRequest) {
  // Validate Twilio signature
  const sig = req.headers.get("x-twilio-signature") ?? "";
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`;
  const body = await req.formData();
  const params: Record<string, string> = {};
  body.forEach((value, key) => { params[key] = value.toString(); });

  if (!validateTwilioSignature(sig, url, params)) {
    return Response.json({ error: "Invalid signature" }, { status: 403 });
  }

  const from = params["From"];         // e.g. +35799000001
  const messageBody = params["Body"] ?? "";

  if (!from) return Response.json({ ok: true }); // ignore

  // Rate limit: max 10 inbound per number per minute
  const now = Date.now();
  const last = recentRequests.get(from) ?? 0;
  if (now - last < 6000) {
    recentRequests.set(from, now);
    return Response.json({ ok: true });
  }
  recentRequests.set(from, now);

  if (isOptOutMessage(messageBody)) {
    // Find all customers with this phone (across businesses — GDPR compliance)
    const customers = await prisma.customer.findMany({
      where: { phone: from, deletedAt: null },
      select: { id: true, businessId: true },
    });

    for (const customer of customers) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { optedOutSms: true },
      });
      await createAuditLog({
        businessId: customer.businessId,
        action: "sms_opt_out",
        entity: "customer",
        entityId: customer.id,
        metadata: { phone: from, originalMessage: messageBody },
      });
    }

    // Twilio expects TwiML back — empty response is fine
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // Non-opt-out inbound: log and ignore
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}
