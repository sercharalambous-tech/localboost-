/**
 * LocalBoost Message Job Runner
 * POST /api/cron — called every minute by Vercel Cron
 *
 * vercel.json cron config:
 * { "crons": [{ "path": "/api/cron", "schedule": "* * * * *" }] }
 *
 * The endpoint is protected by a CRON_SECRET header to prevent abuse.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/twilio";
import { sendEmail, buildUnsubscribeUrl } from "@/lib/email";
import { renderTemplate, buildAppointmentVars } from "@/lib/templates";
import { checkMessageLimit, incrementMessageUsage } from "@/lib/billing-limits";
import { MessageJobStatus, MessageChannel, AutomationRuleType, TemplateLanguage } from "@prisma/client";

const BATCH_SIZE = 50;

export async function POST(req: NextRequest) {
  // Auth via shared secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  // Fetch batch of due jobs
  const jobs = await prisma.messageJob.findMany({
    where: {
      status: MessageJobStatus.QUEUED,
      sendAt: { lte: now },
    },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          consentSms: true,
          consentEmail: true,
          optedOutSms: true,
          optedOutEmail: true,
          deletedAt: true,
        },
      },
      appointment: {
        select: {
          id: true,
          serviceName: true,
          startAt: true,
          confirmToken: true,
          cancelToken: true,
          status: true,
        },
      },
      business: {
        select: {
          id: true,
          name: true,
          timezone: true,
          googleReviewUrl: true,
        },
      },
    },
    orderBy: { sendAt: "asc" },
    take: BATCH_SIZE,
  });

  for (const job of jobs) {
    processed++;

    // ── Mark as processing (optimistic lock) ────────────
    const claimed = await prisma.messageJob.updateMany({
      where: { id: job.id, status: MessageJobStatus.QUEUED },
      data: { status: MessageJobStatus.SENT }, // temporarily claim
    });
    if (claimed.count === 0) {
      skipped++; continue; // already taken by another process
    }

    // Reset to QUEUED for now — we'll update properly after send
    await prisma.messageJob.update({ where: { id: job.id }, data: { status: MessageJobStatus.QUEUED } });

    try {
      // ── Consent + opt-out checks ────────────────────────
      const customer = job.customer;
      if (customer.deletedAt) {
        await skip(job.id, "Customer deleted"); skipped++; continue;
      }

      if (job.channel === MessageChannel.SMS) {
        if (!customer.consentSms || customer.optedOutSms) {
          await skip(job.id, "No SMS consent or opted out"); skipped++; continue;
        }
        if (!customer.phone) {
          await skip(job.id, "No phone number"); skipped++; continue;
        }
      }

      if (job.channel === MessageChannel.EMAIL) {
        if (!customer.consentEmail || customer.optedOutEmail) {
          await skip(job.id, "No email consent or opted out"); skipped++; continue;
        }
        if (!customer.email) {
          await skip(job.id, "No email address"); skipped++; continue;
        }
      }

      // ── Billing limit check ──────────────────────────────
      const limitCheck = await checkMessageLimit(job.businessId);
      if (!limitCheck.allowed) {
        await skip(job.id, `Billing limit: ${limitCheck.reason}`); skipped++; continue;
      }

      // ── Build template body ──────────────────────────────
      const templateBody = await resolveTemplateBody(job);
      if (!templateBody) {
        await skip(job.id, "No template found"); skipped++; continue;
      }

      // ── Send ─────────────────────────────────────────────
      let providerId: string;

      if (job.channel === MessageChannel.SMS) {
        providerId = await sendSms({ to: customer.phone!, body: templateBody.text });
      } else {
        // EMAIL
        providerId = await sendEmail({
          to: customer.email!,
          subject: templateBody.subject ?? `Message from ${job.business.name}`,
          htmlBody: templateBody.html ?? `<p>${templateBody.text}</p>`,
          tag: job.ruleType ?? "transactional",
        });
      }

      await prisma.messageJob.update({
        where: { id: job.id },
        data: {
          status: MessageJobStatus.SENT,
          providerMessageId: providerId,
          sentAt: new Date(),
        },
      });

      await incrementMessageUsage(job.businessId);
      sent++;
    } catch (err: any) {
      failed++;
      await prisma.messageJob.update({
        where: { id: job.id },
        data: { status: MessageJobStatus.FAILED, errorMessage: err?.message ?? "Unknown error" },
      });
      console.error(`[cron] job ${job.id} failed:`, err);
    }
  }

  console.log(`[cron] processed=${processed} sent=${sent} skipped=${skipped} failed=${failed}`);
  return Response.json({ processed, sent, skipped, failed });
}

// ── Helpers ──────────────────────────────────────────────

async function skip(jobId: string, reason: string) {
  await prisma.messageJob.update({
    where: { id: jobId },
    data: { status: MessageJobStatus.SKIPPED, errorMessage: reason },
  });
}

type JobWithRelations = Awaited<ReturnType<typeof prisma.messageJob.findMany>>[number] & {
  customer: { id: string; fullName: string; phone: string | null; email: string | null };
  business: { id: string; name: string; timezone: string; googleReviewUrl: string | null };
  appointment: { id: string; serviceName: string; startAt: Date; confirmToken: string | null; cancelToken: string | null } | null;
};

async function resolveTemplateBody(job: any): Promise<{ text: string; html?: string; subject?: string } | null> {
  const ruleType = job.ruleType as AutomationRuleType;

  // Map rule types to default template lookup
  const channelMap: Record<string, string> = {
    [`${AutomationRuleType.REMINDER_24H}_SMS_EN`]: "tpl-sms-en-24h",
    [`${AutomationRuleType.REMINDER_24H}_SMS_EL`]: "tpl-sms-el-24h",
    [`${AutomationRuleType.REMINDER_2H}_SMS_EN`]: "tpl-sms-en-2h",
    [`${AutomationRuleType.REMINDER_2H}_SMS_EL`]: "tpl-sms-el-2h",
    [`${AutomationRuleType.FEEDBACK_1H}_SMS_EN`]: "tpl-sms-en-feedback",
    [`${AutomationRuleType.FEEDBACK_1H}_SMS_EL`]: "tpl-sms-el-feedback",
    [`${AutomationRuleType.REVIEW_FOLLOWUP_48H}_SMS_EN`]: "tpl-sms-en-review",
    [`${AutomationRuleType.REVIEW_FOLLOWUP_48H}_SMS_EL`]: "tpl-sms-el-review",
    [`${AutomationRuleType.REMINDER_24H}_EMAIL_EN`]: "tpl-email-en-24h",
    [`${AutomationRuleType.FEEDBACK_1H}_EMAIL_EN`]: "tpl-email-en-feedback",
  };

  // Look up the rule's assigned template first, then fall back to business default, then global default
  const rule = await prisma.automationRule.findFirst({
    where: { businessId: job.businessId, type: ruleType },
    include: { template: true },
  });

  let template = rule?.template ?? null;

  if (!template) {
    // Find a default template for this business/channel/ruleType
    const channel = job.channel as MessageChannel;
    template = await prisma.messageTemplate.findFirst({
      where: {
        businessId: job.businessId,
        channel,
        isDefault: true,
        name: { contains: ruleType === AutomationRuleType.REMINDER_24H ? "24" : ruleType === AutomationRuleType.REMINDER_2H ? "2h" : ruleType === AutomationRuleType.FEEDBACK_1H ? "Feedback" : "Review", mode: "insensitive" },
      },
    });
  }

  if (!template || !job.appointment) return null;

  // Build a feedback token if needed
  let feedbackToken: string | undefined;
  if (ruleType === AutomationRuleType.FEEDBACK_1H) {
    const fb = await prisma.feedback.findFirst({ where: { appointmentId: job.appointmentId! } });
    feedbackToken = fb?.token;
  }

  const vars = buildAppointmentVars({
    customerName: job.customer.fullName,
    businessName: job.business.name,
    serviceName: job.appointment.serviceName,
    startAt: job.appointment.startAt,
    timezone: job.business.timezone,
    appointmentId: job.appointment.id,
    confirmToken: job.appointment.confirmToken ?? undefined,
    cancelToken: job.appointment.cancelToken ?? undefined,
    feedbackToken,
    googleReviewUrl: job.business.googleReviewUrl,
    emailUnsubscribeToken: job.customer.id, // using customer.id as unsubscribe token
  });

  const renderedBody = renderTemplate(template.body, vars);
  const renderedSubject = template.subject ? renderTemplate(template.subject, vars) : undefined;

  return {
    text: renderedBody,
    html: job.channel === MessageChannel.EMAIL ? renderedBody : undefined,
    subject: renderedSubject,
  };
}
