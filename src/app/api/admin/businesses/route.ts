import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, BillingStatus } from "@prisma/client";

export async function GET() {
  try {
    const user = await requireAuth();
    if (user.role !== UserRole.ADMIN) throw new AuthError(403, "Admin access required");

    const businesses = await prisma.business.findMany({
      include: {
        owner: { select: { name: true, email: true } },
        billing: { select: { plan: true, status: true, messagesUsedThisMonth: true } },
        _count: { select: { customers: true, appointments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = businesses.length;
    const active = businesses.filter(b => b.billing?.status === BillingStatus.ACTIVE).length;
    const trialing = businesses.filter(b => b.billing?.status === BillingStatus.TRIALING).length;
    const pastDue = businesses.filter(b => b.billing?.status === BillingStatus.PAST_DUE).length;

    return Response.json({ businesses, stats: { total, active, trialing, pastDue } });
  } catch (err) { return authErrorResponse(err); }
}
