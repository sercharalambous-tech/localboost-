import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const appointment = await prisma.appointment.findUnique({
    where: { confirmToken: params.token },
    include: {
      business: { select: { name: true } },
      customer: { select: { fullName: true } },
    },
  });

  if (!appointment) {
    return new Response(confirmPage("Not Found", "This confirmation link is invalid or has already been used.", false), {
      headers: { "Content-Type": "text/html" },
      status: 404,
    });
  }

  if (appointment.status === AppointmentStatus.CANCELLED) {
    return new Response(confirmPage("Appointment Cancelled", "This appointment has already been cancelled.", false), {
      headers: { "Content-Type": "text/html" },
    });
  }

  if (appointment.status === AppointmentStatus.CONFIRMED) {
    return new Response(confirmPage("Already Confirmed", `Your appointment at ${appointment.business.name} is confirmed. See you soon!`, true), {
      headers: { "Content-Type": "text/html" },
    });
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: AppointmentStatus.CONFIRMED },
  });

  return new Response(
    confirmPage(
      "Appointment Confirmed ✅",
      `Thank you, ${appointment.customer.fullName}! Your appointment at <strong>${appointment.business.name}</strong> has been confirmed.`,
      true
    ),
    { headers: { "Content-Type": "text/html" } }
  );
}

function confirmPage(title: string, message: string, success: boolean): string {
  const color = success ? "#16a34a" : "#dc2626";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { background: #fff; border-radius: 12px; padding: 40px; max-width: 440px; width: 90%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: ${color}; font-size: 24px; margin: 0 0 12px; }
    p { color: #374151; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "✅" : "❌"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
