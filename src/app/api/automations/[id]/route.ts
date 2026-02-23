import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";
import { MessageChannel, AutomationRuleType } from "@prisma/client";

const UpdateSchema = z.object({
  enabled: z.boolean().optional(),
  channel: z.nativeEnum(MessageChannel).optional(),
  templateId: z.string().uuid().optional().nullable(),
});

// PATCH /api/automations/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const rule = await prisma.automationRule.findUnique({
      where: { id: params.id },
      include: { business: { select: { ownerUserId: true } } },
    });
    if (!rule) return Response.json({ error: "Not found" }, { status: 404 });
    if (rule.business.ownerUserId !== user.id) throw new AuthError(403, "Access denied");

    const data = UpdateSchema.parse(await req.json());
    const updated = await prisma.automationRule.update({ where: { id: params.id }, data });
    return Response.json({ rule: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}
