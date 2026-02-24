/**
 * LocalBoost Availability Engine
 * Generates open booking slots for a provider on a given date.
 *
 * Algorithm:
 *  1. Fetch WorkingHours for that day-of-week (if none â return [])
 *  2. Generate candidate slots from workStart to (workEnd - duration) every intervalMinutes
 *  3. Remove slots that overlap existing SCHEDULED/CONFIRMED Appointments
 *  4. Remove slots that overlap manually BlockedSlots
 *  5. Remove slots in the past (if date === today)
 *  6. Return clean array
 */

import { prisma } from "@/lib/prisma";
import { addMinutes, format, getDay, isToday, parseISO, startOfDay, endOfDay, set } from "date-fns";

export interface TimeSlot {
  startTime: string; // "09:00"
  endTime: string;   // "09:30"
}

function parseTimeIntoDate(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return set(baseDate, { hours, minutes, seconds: 0, milliseconds: 0 });
}

export async function getAvailableSlots(
  businessId: string,
  date: Date,
  durationMinutes: number,
  intervalMinutes = 30
): Promise<TimeSlot[]> {
  const dayOfWeek = getDay(date); // 0 = Sunday

  // 1. Get working hours for this day
  const hours = await prisma.workingHours.findFirst({
    where: { businessId, dayOfWeek, isActive: true },
  });
  if (!hours) return [];

  const workStart = parseTimeIntoDate(hours.startTime, date);
  const workEnd   = parseTimeIntoDate(hours.endTime, date);

  // 2. Generate candidate start times
  const candidates: Date[] = [];
  let cursor = workStart;
  while (addMinutes(cursor, durationMinutes) <= workEnd) {
    candidates.push(cursor);
    cursor = addMinutes(cursor, intervalMinutes);
  }
  if (candidates.length === 0) return [];

  // 3. Fetch existing appointments for the day (non-cancelled)
  const dayStart = startOfDay(date);
  const dayEnd   = endOfDay(date);
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      businessId,
      startAt: { gte: dayStart, lte: dayEnd },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    select: { startAt: true, endAt: true },
  });

  // 4. Fetch blocked slots for the day
  const blockedSlots = await prisma.blockedSlot.findMany({
    where: {
      businessId,
      date: { gte: dayStart, lte: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });

  const now = new Date();

  // 5. Filter candidates
  const available = candidates.filter((slotStart) => {
    const slotEnd = addMinutes(slotStart, durationMinutes);

    // Remove past slots if today
    if (isToday(date) && slotStart <= now) return false;

    // Check appointment overlaps
    const overlapsAppointment = existingAppointments.some((appt) => {
      const apptEnd = appt.endAt ?? addMinutes(appt.startAt, durationMinutes);
      return appt.startAt < slotEnd && apptEnd > slotStart;
    });
    if (overlapsAppointment) return false;

    // Check blocked slot overlaps
    const overlapsBlocked = blockedSlots.some((b) => {
      const bStart = parseTimeIntoDate(b.startTime, date);
      const bEnd   = parseTimeIntoDate(b.endTime, date);
      return bStart < slotEnd && bEnd > slotStart;
    });
    if (overlapsBlocked) return false;

    return true;
  });

  return available.map((slotStart) => ({
    startTime: format(slotStart, "HH:mm"),
    endTime:   format(addMinutes(slotStart, durationMinutes), "HH:mm"),
  }));
}
