import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";
import { createPortalSession } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { businessId } = await req.json();

    const business = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: user.id } });
    if (!business) throw new AuthError(403, "Access denied");

    const billing = await prisma.billing.findUnique({ where: { businessId } });
    if (!billing?.stripeCustomerId) {
      return Response.json({ error: "No billing account found" }, { status: 400 });
    }

    const session = await createPortalSession({
      stripeCustomerId: billing.stripeCustomerId,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    });

    return Response.json({ url: session.url });
  } catch (err) { return authErrorResponse(err); }
}
