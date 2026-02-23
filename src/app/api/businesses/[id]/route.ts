import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  industry: z.string().optional(),
  timezone: z.string().optional(),
  googleReviewUrl: z.string().url().optional().or(z.literal("")).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const business = await prisma.business.findFirst({ where: { id: params.id, ownerUserId: user.id } });
    if (!business) throw new AuthError(403, "Access denied");

    const data = UpdateSchema.parse(await req.json());
    const updated = await prisma.business.update({
      where: { id: params.id },
      data: { ...data, googleReviewUrl: data.googleReviewUrl || null },
    });
    return Response.json({ business: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}
