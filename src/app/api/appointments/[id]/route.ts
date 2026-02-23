import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";
import { scheduleRemindersForAppointment, schedulePostVisitJobs } from "@/lib/scheduler";
import { createAuditLog } from "@/lib/audit";
import { AppointmentStatus } from "@prisma/client";

const UpdateSchema = z.object({
  serviceName: z.string().min(1).max(100).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  locationId: z.string().uuid().optional().nullable(),
});

async function getAppointmentWithAccess(id: string, userId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      business: { select: { ownerUserId: true } },
      customer: { select: { id: true, fullName: true, phone: true, email: true } },
      location: { select: { id: true, name: true } },
    },
  });
  if (!appointment) throw new AuthError(404, "Appointment not found");
  if (appointment.business.ownerUserId !== userId) throw new AuthError(403, "Access denied");
  return appointment;
}

// GET /api/appointments/[id]
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const apt = await getAppointmentWithAccess(params.id, user.id);
    return Response.json({ appointment: apt });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// PATCH /api/appointments/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const apt = await getAppointmentWithAccess(params.id, user.id);
    const body = await req.json();
    const data = UpdateSchema.parse(body);

    const wasCompleted = apt.status !== AppointmentStatus.COMPLETED &&
      data.status === AppointmentStatus.COMPLETED;

    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        ...(data.serviceName && { serviceName: data.serviceName }),
        ...(data.startAt && { startAt: new Date(data.startAt) }),
        ...(data.endAt && { endAt: new Date(data.endAt) }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status && { status: data.status }),
        ...(data.locationId !== undefined && { locationId: data.locationId }),
      },
      include: {
        customer: { select: { id: true, fullName: true, phone: true, email: true } },
        location: { select: { id: true, name: true } },
      },
    });

    // If time changed, reschedule reminders
    if (data.startAt) {
      scheduleRemindersForAppointment(params.id).catch(console.error);
    }

    // If just completed, schedule feedback request
    if (wasCompleted) {
      schedulePostVisitJobs(params.id).catch(console.error);
    }

    await createAuditLog({
      businessId: apt.businessId,
      actorUserId: user.id,
      action: "update",
      entity: "appointment",
      entityId: params.id,
      metadata: { changes: data },
    });

    return Response.json({ appointment: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.errors[0].message }, { status: 422 });
    }
    return authErrorResponse(err);
  }
}

// DELETE /api/appointments/[id]
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    await getAppointmentWithAccess(params.id, user.id);

    await prisma.appointment.delete({ where: { id: params.id } });

    return Response.json({ success: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
