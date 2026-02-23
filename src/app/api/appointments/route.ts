import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";
import { scheduleRemindersForAppointment } from "@/lib/scheduler";
import { createAuditLog } from "@/lib/audit";
import { randomUUID } from "crypto";

const CreateSchema = z.object({
  businessId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  serviceName: z.string().min(1).max(100),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

// GET /api/appointments?businessId=...&page=1&status=...
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = 20;

    if (!businessId) {
      return Response.json({ error: "businessId required" }, { status: 400 });
    }

    // Verify access
    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerUserId: user.id },
    });
    if (!business) return Response.json({ error: "Access denied" }, { status: 403 });

    const where: any = { businessId };
    if (status) where.status = status;

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true, email: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: { startAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    return Response.json({ appointments, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// POST /api/appointments
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = CreateSchema.parse(body);

    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: { id: data.businessId, ownerUserId: user.id },
    });
    if (!business) throw new AuthError(403, "Access denied");

    // Verify customer belongs to business
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, businessId: data.businessId, deletedAt: null },
    });
    if (!customer) return Response.json({ error: "Customer not found" }, { status: 404 });

    const appointment = await prisma.appointment.create({
      data: {
        id: randomUUID(),
        businessId: data.businessId,
        locationId: data.locationId,
        customerId: data.customerId,
        serviceName: data.serviceName,
        startAt: new Date(data.startAt),
        endAt: data.endAt ? new Date(data.endAt) : undefined,
        notes: data.notes,
        confirmToken: randomUUID(),
        cancelToken: randomUUID(),
      },
      include: {
        customer: { select: { id: true, fullName: true, phone: true, email: true } },
      },
    });

    // Schedule reminder jobs async (non-blocking)
    scheduleRemindersForAppointment(appointment.id).catch(console.error);

    await createAuditLog({
      businessId: data.businessId,
      actorUserId: user.id,
      action: "create",
      entity: "appointment",
      entityId: appointment.id,
    });

    return Response.json({ appointment }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.errors[0].message }, { status: 422 });
    }
    return authErrorResponse(err);
  }
}
