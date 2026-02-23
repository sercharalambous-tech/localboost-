import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  // token is the customer.id (UUID) — simple but effective for MVP
  // In production, you'd use a signed token. For MVP we use the customer UUID.
  const customer = await prisma.customer.findUnique({
    where: { id: params.token },
    select: { id: true, businessId: true, email: true, deletedAt: true },
  });

  if (!customer || customer.deletedAt) {
    return new Response(unsubPage(false, "Link not found or already processed."), {
      headers: { "Content-Type": "text/html" }, status: 404,
    });
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { optedOutEmail: true },
  });

  await createAuditLog({
    businessId: customer.businessId,
    action: "email_unsubscribe",
    entity: "customer",
    entityId: customer.id,
    metadata: { email: customer.email },
  });

  return new Response(unsubPage(true, "You have been unsubscribed from email reminders."), {
    headers: { "Content-Type": "text/html" },
  });
}

function unsubPage(success: boolean, message: string): string {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Unsubscribe</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9fafb;margin:0}
.card{background:#fff;border-radius:12px;padding:40px;max-width:440px;width:90%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h1{color:${success ? "#16a34a" : "#dc2626"};font-size:22px;margin:0 0 12px}p{color:#374151}</style>
</head><body><div class="card">
<div style="font-size:40px;margin-bottom:12px">${success ? "✅" : "❌"}</div>
<h1>${success ? "Unsubscribed" : "Error"}</h1><p>${message}</p>
</div></body></html>`;
}
