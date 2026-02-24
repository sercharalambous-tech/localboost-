import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";

const HoursRowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/),
  isActive:  z.boolean(),
});

// GET /api/working-hours?businessId=...
export async function GET(req: NextRequest) {
  try {
    const user       = await requireAuth();
    const businessId = new URL(req.url).searchParams.get("businessId");
    if (!businessId) return Response.json({ error: "businessId required" }, { status: 400 });

    const business = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: user.id } });
    if (!business) return Response.json({ error: "Access denied" }, { status: 403 });

    const workingHours = await prisma.workingHours.findMany({
      where: { businessId },
      orderBy: { dayOfWeek: "asc" },
    });

    return Response.json({ workingHours });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// PUT /api/working-hours â replace all 7 days atomically
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { businessId, hours } = z.object({
      businessId: z.string().uuid(),
      hours:      z.array(HoursRowSchema).length(7),
    }).parse(body);

    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerUserId: user.id },
      include: { providerProfile: true },
    });
    if (!business) throw new AuthError(403, "Access denied");
    if (!business.providerProfile) {
      return Response.json({ error: "Create a provider profile first" }, { status: 400 });
    }

    const profileId = business.providerProfile.id;

    // Upsert all 7 rows in a transaction
    await prisma.$transaction(
      hours.map((h) =>
        prisma.workingHours.upsert({
          where:  { businessId_dayOfWeek: { businessId, dayOfWeek: h.dayOfWeek } },
          update: { startTime: h.startTime, endTime: h.endTime, isActive: h.isActive },
          create: { businessId, profileId, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isActive: h.isActive },
        })
      )
    );

    const workingHours = await prisma.workingHours.findMany({
      where: { businessId },
      orderBy: { dayOfWeek: "asc" },
    });

    return Response.json({ workingHours });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}
