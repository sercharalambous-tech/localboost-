import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/availability";
import { parseISO, isValid, isBefore, startOfDay } from "date-fns";

// GET /api/public/providers/[slug]/availability?date=YYYY-MM-DD&serviceId=...
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(req.url);
  const dateStr   = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  if (!dateStr || !serviceId) {
    return Response.json({ error: "date and serviceId are required" }, { status: 400 });
  }

  const date = parseISO(dateStr);
  if (!isValid(date)) return Response.json({ error: "Invalid date" }, { status: 400 });

  // Prevent booking in the past
  if (isBefore(startOfDay(date), startOfDay(new Date()))) {
    return Response.json({ slots: [] });
  }

  // Resolve profile
  const profile = await prisma.providerProfile.findUnique({
    where: { slug: params.slug, isPublic: true },
    select: { businessId: true },
  });
  if (!profile) return Response.json({ error: "Provider not found" }, { status: 404 });

  // Resolve service duration
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: profile.businessId, isActive: true },
    select: { durationMinutes: true },
  });
  if (!service) return Response.json({ error: "Service not found" }, { status: 404 });

  const slots = await getAvailableSlots(profile.businessId, date, service.durationMinutes);
  return Response.json({ slots });
}
