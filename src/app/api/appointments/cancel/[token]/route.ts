import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus, MessageJobStatus } from "@prisma/client";

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const appointment = await prisma.appointment.findUnique({
    where: { cancelToken: params.token },
    include: { business: { select: { name: true } }, customer: { select: { fullName: true } } },
  });

  if (!appointment) {
    return new Response(page("Not Found", "This cancellation link is invalid.", false), {
      headers: { "Content-Type": "text/html" }, status: 404,
    });
  }

  if (appointment.status === AppointmentStatus.CANCELLED) {
    return new Response(page("Already Cancelled", "This appointment was already cancelled.", false), {
      headers: { "Content-Type": "text/html" },
    });
  }

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: AppointmentStatus.CANCELLED },
    }),
    prisma.messageJob.updateMany({
      where: { appointmentId: appointment.id, status: MessageJobStatus.QUEUED },
      data: { status: MessageJobStatus.SKIPPED },
    }),
  ]);

  return new Response(
    page("Appointment Cancelled", `Your appointment at <strong>${appointment.business.name}</strong> has been cancelled. We hope to see you again soon!`, true),
    { headers: { "Content-Type": "text/html" } }
  );
}

function page(title: string, message: string, soft: boolean): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb}
    .card{background:#fff;border-radius:12px;padding:40px;max-width:440px;width:90%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    h1{color:${soft?"#92400e":"#dc2626"};font-size:24px;margin:0 0 12px}
    p{color:#374151;line-height:1.6}
  </style>
</head><body>
  <div class="card">
    <div style="font-size:48px;margin-bottom:16px">${soft?"🗓️":"❌"}</div>
    <h1>${title}</h1><p>${message}</p>
  </div>
</body></html>`;
}
