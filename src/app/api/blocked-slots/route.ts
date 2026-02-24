import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";

const SlotSchema = z.object({
  businessId: z.string().uuid(),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime:  z.string().regex(/^\d{2}:\d{2}$/),
  endTime:    z.string().regex(/^\d{2}:\d{2}$/),
  reason:     z.string().max(200).optional(),
});

// GET /api/blocked-slots?businessId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) return Response.json({ error: "businessId required" }, { status: 400 });

    const business = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: user.id } });
    if (!business) return Response.json({ error: "Access denied" }, { status: 403 });

    const from = searchParams.get("from");
    const to   = searchParams.get("to");
    const where: any = { businessId };
    if (from) where.date = { ...(where.date ?? {}), gte: new Date(from) };
    if (to)   where.date = { ...(where.date ?? {}), lte: new Date(to) };

    const blockedSlots = await prisma.blockedSlot.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return Response.json({ blockedSlots });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// POST /api/blocked-slots
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = SlotSchema.parse(body);

    const business = await prisma.business.findFirst({
      where: { id: data.businessId, ownerUserId: user.id },
      include: { providerProfile: true },
    });
    if (!business) throw new AuthError(403, "Access denied");
    if (!business.providerProfile) return Response.json({ error: "Profile not found" }, { status: 400 });

    const blockedSlot = await prisma.blockedSlot.create({
      data: {
        businessId: data.businessId,
        profileId:  business.providerProfile.id,
        date:       new Date(data.date),
        startTime:  data.startTime,
        endTime:    data.endTime,
        reason:     data.reason,
      },
    });

    return Response.json({ blockedSlot }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}
