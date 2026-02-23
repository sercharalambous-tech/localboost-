/**
 * LocalBoost Scheduler
 * Computes and (re)schedules message_jobs for an appointment.
 * Called whenever an appointment is created or updated.
 */

import { prisma } from "@/lib/prisma";
import {
  AutomationRuleType,
  AppointmentStatus,
  MessageChannel,
  MessageJobStatus,
  Prisma,
} from "@prisma/client";
import { addMinutes, subMinutes } from "date-fns";
import { randomUUID } from "crypto";

// ── Types ────────────────────────────────────────────────

type AppointmentWithRelations = {
  id: string;
  businessId: string;
  customerId: string;
  startAt: Date;
  status: AppointmentStatus;
  customer: {
    consentSms: boolean;
    consentEmail: boolean;
    optedOutSms: boolean;
    optedOutEmail: boolean;
  };
};

// ── Public API ───────────────────────────────────────────

/**
 * Recalculate and upsert message jobs for reminder automations.
 * Call this every time an appointment is created or its time/status changes.
 */
export async function scheduleRemindersForAppointment(
  appointmentId: string
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      customer: {
        select: {
          consentSms: true,
          consentEmail: true,
          optedOutSms: true,
          optedOutEmail: true,
        },
      },
    },
  });

  if (!appointment) return;

  // If cancelled, skip all pending reminder jobs
  if (
    appointment.status === AppointmentStatus.CANCELLED ||
    appointment.status === AppointmentStatus.NO_SHOW
  ) {
    await prisma.messageJob.updateMany({
      where: {
        appointmentId,
        status: MessageJobStatus.QUEUED,
        ruleType: { in: [AutomationRuleType.REMINDER_24H, AutomationRuleType.REMINDER_2H] },
      },
      data: { status: MessageJobStatus.SKIPPED },
    });
    return;
  }

  // Fetch enabled automation rules for this business
  const rules = await prisma.automationRule.findMany({
    where: {
      businessId: appointment.businessId,
      enabled: true,
      type: { in: [AutomationRuleType.REMINDER_24H, AutomationRuleType.REMINDER_2H] },
    },
  });

  for (const rule of rules) {
    const sendAt = computeSendAt(appointment.startAt, rule.type);
    if (!sendAt || sendAt <= new Date()) continue; // already past

    const channels = resolveChannels(rule.channel, appointment.customer);

    for (const channel of channels) {
      // Cancel any existing queued job for this appointment+rule+channel
      await prisma.messageJob.updateMany({
        where: {
          appointmentId,
          ruleType: rule.type,
          channel,
          status: MessageJobStatus.QUEUED,
        },
        data: { status: MessageJobStatus.SKIPPED },
      });

      // Create new job
      await prisma.messageJob.create({
        data: {
          id: randomUUID(),
          businessId: appointment.businessId,
          customerId: appointment.customerId,
          appointmentId,
          channel,
          ruleType: rule.type,
          sendAt,
          status: MessageJobStatus.QUEUED,
        },
      });
    }
  }
}

/**
 * Schedule feedback + review jobs after appointment is completed.
 * Call this when appointment.status transitions to COMPLETED.
 */
export async function schedulePostVisitJobs(appointmentId: string): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      customer: {
        select: {
          consentSms: true,
          consentEmail: true,
          optedOutSms: true,
          optedOutEmail: true,
        },
      },
    },
  });

  if (!appointment) return;

  const rules = await prisma.automationRule.findMany({
    where: {
      businessId: appointment.businessId,
      enabled: true,
      type: AutomationRuleType.FEEDBACK_1H,
    },
  });

  const now = new Date();

  for (const rule of rules) {
    const sendAt = addMinutes(now, rule.delayMinutes || 60);
    const channels = resolveChannels(rule.channel, appointment.customer);

    for (const channel of channels) {
      // Idempotency: skip if job already exists
      const existing = await prisma.messageJob.findFirst({
        where: { appointmentId, ruleType: rule.type, channel, status: { not: MessageJobStatus.SKIPPED } },
      });
      if (existing) continue;

      await prisma.messageJob.create({
        data: {
          id: randomUUID(),
          businessId: appointment.businessId,
          customerId: appointment.customerId,
          appointmentId,
          channel,
          ruleType: AutomationRuleType.FEEDBACK_1H,
          sendAt,
          status: MessageJobStatus.QUEUED,
        },
      });
    }
  }
}

/**
 * Schedule Google review request after positive feedback.
 * Call this when feedback.rating >= 4 is submitted.
 */
export async function scheduleReviewJob(
  appointmentId: string,
  businessId: string,
  customerId: string
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      customer: {
        select: {
          consentSms: true,
          consentEmail: true,
          optedOutSms: true,
          optedOutEmail: true,
        },
      },
    },
  });
  if (!appointment) return;

  const rule = await prisma.automationRule.findFirst({
    where: {
      businessId,
      type: AutomationRuleType.REVIEW_FOLLOWUP_48H,
      enabled: true,
    },
  });
  if (!rule) return;

  const channels = resolveChannels(rule.channel, appointment.customer);
  const sendAt = addMinutes(new Date(), 5); // send near-immediately after feedback

  for (const channel of channels) {
    const existing = await prisma.messageJob.findFirst({
      where: { appointmentId, ruleType: AutomationRuleType.REVIEW_FOLLOWUP_48H, channel, status: { not: MessageJobStatus.SKIPPED } },
    });
    if (existing) continue;

    await prisma.messageJob.create({
      data: {
        id: randomUUID(),
        businessId,
        customerId,
        appointmentId,
        channel,
        ruleType: AutomationRuleType.REVIEW_FOLLOWUP_48H,
        sendAt,
        status: MessageJobStatus.QUEUED,
      },
    });
  }
}

// ── Helpers ──────────────────────────────────────────────

function computeSendAt(startAt: Date, ruleType: AutomationRuleType): Date | null {
  switch (ruleType) {
    case AutomationRuleType.REMINDER_24H:
      return subMinutes(startAt, 24 * 60);
    case AutomationRuleType.REMINDER_2H:
      return subMinutes(startAt, 120);
    default:
      return null;
  }
}

function resolveChannels(
  channel: MessageChannel,
  customer: {
    consentSms: boolean;
    consentEmail: boolean;
    optedOutSms: boolean;
    optedOutEmail: boolean;
  }
): MessageChannel[] {
  const result: MessageChannel[] = [];
  if (
    (channel === MessageChannel.SMS || channel === MessageChannel.BOTH) &&
    customer.consentSms &&
    !customer.optedOutSms
  ) {
    result.push(MessageChannel.SMS);
  }
  if (
    (channel === MessageChannel.EMAIL || channel === MessageChannel.BOTH) &&
    customer.consentEmail &&
    !customer.optedOutEmail
  ) {
    result.push(MessageChannel.EMAIL);
  }
  return result;
}
