import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/public/providers/[slug]
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const profile = await prisma.providerProfile.findUnique({
    where: { slug: params.slug, isPublic: true },
    include: {
      business: { select: { id: true, name: true, timezone: true } },
      services: {
        where:   { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      workingHours: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!profile) {
    return Response.json({ error: "Provider not found" }, { status: 404 });
  }

  return Response.json({ profile });
}
