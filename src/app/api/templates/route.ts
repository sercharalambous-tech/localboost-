import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, authErrorResponse, AuthError } from "@/lib/auth";
import { MessageChannel, TemplateLanguage } from "@prisma/client";
import { randomUUID } from "crypto";

const CreateSchema = z.object({
  businessId: z.string().uuid(),
  channel: z.nativeEnum(MessageChannel),
  language: z.nativeEnum(TemplateLanguage),
  name: z.string().min(1).max(100),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(2000),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const businessId = new URL(req.url).searchParams.get("businessId");
    if (!businessId) return Response.json({ error: "businessId required" }, { status: 400 });

    const business = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: user.id } });
    if (!business) return Response.json({ error: "Access denied" }, { status: 403 });

    const templates = await prisma.messageTemplate.findMany({
      where: { businessId },
      orderBy: [{ channel: "asc" }, { language: "asc" }, { name: "asc" }],
    });
    return Response.json({ templates });
  } catch (err) { return authErrorResponse(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const data = CreateSchema.parse(await req.json());
    const business = await prisma.business.findFirst({ where: { id: data.businessId, ownerUserId: user.id } });
    if (!business) throw new AuthError(403, "Access denied");

    const template = await prisma.messageTemplate.create({
      data: { id: randomUUID(), ...data },
    });
    return Response.json({ template }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    return authErrorResponse(err);
  }
}
