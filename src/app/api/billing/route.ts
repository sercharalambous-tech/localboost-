import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";
import { stripe, createCheckoutSession, PLAN_LIMITS } from "@/lib/stripe";
import { BillingPlan } from "@prisma/client";

const CheckoutSchema = z.object({
  businessId: z.string().uuid(),
  plan: z.nativeEnum(BillingPlan),
});

// GET /api/billing?businessId=... — get billing info
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const businessId = new URL(req.url).searchParams.get("businessId");
    if (!businessId) return Response.json({ error: "businessId required" }, { status: 400 });

    const business = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: user.id } });
    if (!business) return Response.json({ error: "Access denied" }, { status: 403 });

    const billing = await prisma.billing.findUnique({ where: { businessId } });
    const limits = billing ? PLAN_LIMITS[billing.plan] : null;

    return Response.json({ billing, limits });
  } catch (err) { return authErrorResponse(err); }
}

// POST /api/billing — create Stripe checkout session
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { businessId, plan } = CheckoutSchema.parse(body);

    const business = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: user.id } });
    if (!business) throw new AuthError(403, "Access denied");

    const billing = await prisma.billing.findUnique({ where: { businessId } });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

    const session = await createCheckoutSession({
      plan,
      stripeCustomerId: billing?.stripeCustomerId ?? undefined,
      businessId,
      successUrl: `${appUrl}/billing?success=1`,
      cancelUrl: `${appUrl}/billing`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}
