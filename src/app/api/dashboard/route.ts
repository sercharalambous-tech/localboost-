import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/stripe";
import { AppointmentStatus, MessageJobStatus, AutomationRuleType } from "@prisma/client";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const businessId = new URL(req.url).searchParams.get("businessId");
    if (!businessId) return Response.json({ error: "businessId required" }, { status: 400 });

    const business = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: user.id } });
    if (!business) throw new AuthError(403, "Access denied");

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [
      totalAppointments,
      confirmedCount,
      noShowCount,
      completedCount,
      reviewJobsSent,
      feedbacks,
      billing,
      recentAppointments,
    ] = await Promise.all([
      prisma.appointment.count({ where: { businessId, startAt: { gte: monthStart, lte: monthEnd } } }),
      prisma.appointment.count({ where: { businessId, status: AppointmentStatus.CONFIRMED, startAt: { gte: monthStart } } }),
      prisma.appointment.count({ where: { businessId, status: AppointmentStatus.NO_SHOW, startAt: { gte: monthStart } } }),
      prisma.appointment.count({ where: { businessId, status: AppointmentStatus.COMPLETED, startAt: { gte: monthStart } } }),
      prisma.messageJob.count({ where: { businessId, ruleType: AutomationRuleType.REVIEW_FOLLOWUP_48H, status: MessageJobStatus.SENT } }),
      prisma.feedback.findMany({
        where: { businessId, createdAt: { gte: monthStart } },
        select: { rating: true },
      }),
      prisma.billing.findUnique({ where: { businessId } }),
      prisma.appointment.findMany({
        where: { businessId, startAt: { gte: now } },
        include: { customer: { select: { fullName: true } } },
        orderBy: { startAt: "asc" },
        take: 5,
      }),
    ]);

    const avgRating = feedbacks.length
      ? feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length
      : null;

    const confirmedRate = totalAppointments > 0 ? Math.round((confirmedCount / totalAppointments) * 100) : 0;
    const noShowRate = totalAppointments > 0 ? Math.round((noShowCount / totalAppointments) * 100) : 0;
    const limits = billing ? PLAN_LIMITS[billing.plan] : { messagesPerMonth: 0 };

    return Response.json({
      stats: {
        totalAppointments,
        confirmedRate,
        noShowRate,
        completedCount,
        reviewRequestsSent: reviewJobsSent,
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        feedbackCount: feedbacks.length,
        messagesUsed: billing?.messagesUsedThisMonth ?? 0,
        messageLimit: limits.messagesPerMonth,
      },
      upcomingAppointments: recentAppointments,
    });
  } catch (err) { return authErrorResponse(err); }
}
