import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ user: null, business: null }, { status: 401 });

  const business = await prisma.business.findFirst({
    where: { ownerUserId: user.id },
    include: { billing: true, locations: true, _count: { select: { customers: true, appointments: true } } },
  });

  return Response.json({ user, business });
}
