import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/availability";
import { scheduleRemindersForAppointment } from "@/lib/scheduler";
import { parseISO, addMinutes, format } from "date-fns";
import { randomUUID } from "crypto";

const BookSchema = z.object({
  serviceId:    z.string().uuid(),
  startAt:      z.string().datetime(),
  guestName:    z.string().min(1).max(100).optional(),
  guestPhone:   z.string().min(8).max(30).optional(),
  guestEmail:   z.string().email().optional(),
  consentSms:   z.boolean().default(false),
  consentEmail: z.boolean().default(false),
  notes:        z.string().max(500).optional(),
}).refine(
  (d) => d.guestName && d.guestPhone,
  { message: "Name and phone are required for guest bookings" }
);

// POST /api/public/providers/[slug]/book
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const body = await req.json();
    const data = BookSchema.parse(body);

    // 1. Resolve profile
    const profile = await prisma.providerProfile.findUnique({
      where: { slug: params.slug, isPublic: true },
      include: { services: { where: { id: data.serviceId, isActive: true } } },
    });
    if (!profile) return Response.json({ error: "Provider not found" }, { status: 404 });

    const service = profile.services[0];
    if (!service) return Response.json({ error: "Service not found" }, { status: 404 });

    // 2. Validate slot is still available
    const startAt = new Date(data.startAt);
    const available = await getAvailableSlots(profile.businessId, startAt, service.durationMinutes);
    const slotTime = format(startAt, "HH:mm");
    const isOpen = available.some((s) => s.startTime === slotTime);
    if (!isOpen) {
      return Response.json({ error: "This time slot is no longer available" }, { status: 409 });
    }

    // 3. Find or create customer record
    let customer = await prisma.customer.findFirst({
      where: {
        businessId: profile.businessId,
        phone:      data.guestPhone,
        deletedAt:  null,
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          id:               randomUUID(),
          businessId:       profile.businessId,
          fullName:         data.guestName!,
          phone:            data.guestPhone,
          email:            data.guestEmail,
          consentSms:       data.consentSms,
          consentEmail:     data.consentEmail,
          consentSource:    "marketplace_booking",
          consentTimestamp: new Date(),
        },
      });
    }

    // 4. Create appointment
    const endAt         = addMinutes(startAt, service.durationMinutes);
    const confirmToken  = randomUUID();
    const cancelToken   = randomUUID();

    const appointment = await prisma.appointment.create({
      data: {
        id:          randomUUID(),
        businessId:  profile.businessId,
        customerId:  customer.id,
        serviceName: service.name,
        startAt,
        endAt,
        notes:       data.notes,
        confirmToken,
        cancelToken,
      },
    });

    // 5. Create PublicBooking record
    const publicBooking = await prisma.publicBooking.create({
      data: {
        id:            randomUUID(),
        businessId:    profile.businessId,
        profileId:     profile.id,
        serviceId:     service.id,
        customerId:    customer.id,
        appointmentId: appointment.id,
        guestName:     data.guestName,
        guestPhone:    data.guestPhone,
        guestEmail:    data.guestEmail,
        consentSms:    data.consentSms,
        consentEmail:  data.consentEmail,
        startAt,
        notes:         data.notes,
        status:        "CONFIRMED",
        confirmToken,
      },
    });

    // 6. Schedule reminders (non-blocking)
    scheduleRemindersForAppointment(appointment.id).catch(console.error);

    return Response.json(
      {
        ok:            true,
        confirmToken,
        appointmentId: appointment.id,
        booking: {
          id:          publicBooking.id,
          serviceName: service.name,
          startAt:     appointment.startAt,
          endAt:       appointment.endAt,
          providerName:profile.displayName,
          providerSlug:profile.slug,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.errors[0].message }, { status: 422 });
    }
    console.error("[public-book]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
