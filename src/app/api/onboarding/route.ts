import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { randomUUID } from "crypto";
import { AutomationRuleType, MessageChannel, BillingStatus } from "@prisma/client";

const Schema = z.object({
  name: z.string().min(1),
  industry: z.string(),
  timezone: z.string(),
  locationName: z.string(),
  locationAddress: z.string().optional(),
  locationPhone: z.string().optional(),
  googleReviewUrl: z.string().url().optional().or(z.literal("")),
  plan: z.enum(["STARTER", "PRO", "PREMIUM"]).default("STARTER"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = Schema.parse(await req.json());

    // Check if business already exists for this user
    const existing = await prisma.business.findFirst({ where: { ownerUserId: user.id } });
    if (existing) {
      return Response.json({ error: "Business already set up" }, { status: 409 });
    }

    const businessId = randomUUID();

    await prisma.$transaction(async (tx) => {
      // Create business
      await tx.business.create({
        data: {
          id: businessId,
          name: body.name,
          industry: body.industry,
          timezone: body.timezone,
          ownerUserId: user.id,
          googleReviewUrl: body.googleReviewUrl || null,
          onboardingCompleted: true,
        },
      });

      // Create default location
      await tx.location.create({
        data: {
          id: randomUUID(),
          businessId,
          name: body.locationName,
          address: body.locationAddress,
          phone: body.locationPhone,
        },
      });

      // Create default automation rules
      const rules = [
        { type: AutomationRuleType.REMINDER_24H, delayMinutes: -1440, channel: MessageChannel.BOTH },
        { type: AutomationRuleType.REMINDER_2H, delayMinutes: -120, channel: MessageChannel.SMS },
        { type: AutomationRuleType.FEEDBACK_1H, delayMinutes: 60, channel: MessageChannel.BOTH },
        { type: AutomationRuleType.REVIEW_FOLLOWUP_48H, delayMinutes: 5, channel: MessageChannel.BOTH },
      ];
      for (const rule of rules) {
        await tx.automationRule.create({
          data: { id: randomUUID(), businessId, ...rule, enabled: true },
        });
      }

      // Create billing (trialing)
      await tx.billing.create({
        data: {
          id: randomUUID(),
          businessId,
          plan: body.plan as any,
          status: BillingStatus.TRIALING,
          usagePeriodStart: new Date(),
        },
      });
    });

    return Response.json({ businessId, success: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}
