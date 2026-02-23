import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const businessId = new URL(req.url).searchParams.get("businessId");
    if (!businessId) return Response.json({ error: "businessId required" }, { status: 400 });

    const business = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: user.id } });
    if (!business) throw new AuthError(403, "Access denied");

    const rules = await prisma.automationRule.findMany({
      where: { businessId },
      orderBy: { type: "asc" },
    });
    return Response.json({ rules });
  } catch (err) { return authErrorResponse(err); }
}
