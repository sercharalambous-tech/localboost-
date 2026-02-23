import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";
import { sendSms } from "@/lib/twilio";
import { sendEmail } from "@/lib/email";
import { renderTemplate } from "@/lib/templates";
import { MessageChannel } from "@prisma/client";

const Schema = z.object({
  templateId: z.string().uuid(),
  email: z.string().optional(),
  phone: z.string().optional(),
  businessId: z.string().uuid(),
});

const SAMPLE_VARS = {
  customer_name: "Test Customer",
  business_name: "My Business",
  appointment_date: "15/06/2025",
  appointment_time: "10:00",
  service_name: "Haircut",
  confirm_url: "https://example.com/confirm",
  cancel_url: "https://example.com/cancel",
  feedback_url: "https://example.com/feedback",
  review_url: "https://g.page/r/test/review",
  unsubscribe_url: "https://example.com/unsubscribe",
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { templateId, email, phone, businessId } = Schema.parse(await req.json());

    const business = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: user.id } });
    if (!business) throw new AuthError(403, "Access denied");

    const template = await prisma.messageTemplate.findFirst({
      where: { id: templateId, businessId },
    });
    if (!template) return Response.json({ error: "Template not found" }, { status: 404 });

    const body = renderTemplate(template.body, { ...SAMPLE_VARS, business_name: business.name });

    if (template.channel === MessageChannel.SMS && phone) {
      await sendSms({ to: phone, body });
    } else if (template.channel === MessageChannel.EMAIL && email) {
      const subject = template.subject
        ? renderTemplate(template.subject, { ...SAMPLE_VARS, business_name: business.name })
        : `[TEST] Message from ${business.name}`;
      await sendEmail({ to: email, subject, htmlBody: body, tag: "test" });
    }

    return Response.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}
