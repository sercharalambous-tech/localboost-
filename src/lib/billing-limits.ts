import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/stripe";
import { BillingStatus } from "@prisma/client";

/**
 * Check whether a business can still send messages this month.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export async function checkMessageLimit(businessId: string): Promise<
  { allowed: true } | { allowed: false; reason: string }
> {
  const billing = await prisma.billing.findUnique({
    where: { businessId },
  });

  if (!billing) {
    return { allowed: false, reason: "No active subscription found." };
  }

  if (
    billing.status === BillingStatus.CANCELLED ||
    billing.status === BillingStatus.PAST_DUE
  ) {
    return { allowed: false, reason: "Subscription is not active. Please update your billing." };
  }

  const limits = PLAN_LIMITS[billing.plan];
  if (billing.messagesUsedThisMonth >= limits.messagesPerMonth) {
    return {
      allowed: false,
      reason: `Monthly message limit of ${limits.messagesPerMonth} reached. Please upgrade your plan.`,
    };
  }

  return { allowed: true };
}

/**
 * Increment the message usage counter for a business.
 * Also resets the counter if a new billing period has started.
 */
export async function incrementMessageUsage(businessId: string, count = 1): Promise<void> {
  const billing = await prisma.billing.findUnique({ where: { businessId } });
  if (!billing) return;

  const now = new Date();
  const periodStart = billing.usagePeriodStart;

  // If we're past the current period, reset
  if (periodStart && billing.currentPeriodEnd && now > billing.currentPeriodEnd) {
    await prisma.billing.update({
      where: { businessId },
      data: {
        messagesUsedThisMonth: count,
        usagePeriodStart: now,
      },
    });
    return;
  }

  await prisma.billing.update({
    where: { businessId },
    data: { messagesUsedThisMonth: { increment: count } },
  });
}
