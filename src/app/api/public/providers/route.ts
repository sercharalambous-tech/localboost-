import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { IndustryCategory } from "@prisma/client";

// GET /api/public/providers?category=&city=&minRating=&q=&page=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category  = searchParams.get("category") as IndustryCategory | null;
  const city      = searchParams.get("city");
  const minRating = parseFloat(searchParams.get("minRating") ?? "0");
  const q         = searchParams.get("q");
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit     = 24;

  const where: any = {
    isPublic: true,
    avgRating: { gte: minRating },
  };

  if (category && Object.values(IndustryCategory).includes(category)) {
    where.industryCategory = category;
  }

  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }

  if (q) {
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { bio:         { contains: q, mode: "insensitive" } },
    ];
  }

  const [profiles, total] = await Promise.all([
    prisma.providerProfile.findMany({
      where,
      select: {
        id:               true,
        slug:             true,
        displayName:      true,
        profileImageUrl:  true,
        industryCategory: true,
        city:             true,
        avgRating:        true,
        reviewCount:      true,
        services: {
          where:   { isActive: true },
          select:  { price: true },
          orderBy: { price: "asc" },
          take:    20,
        },
      },
      orderBy: [{ avgRating: "desc" }, { reviewCount: "desc" }],
      skip:   (page - 1) * limit,
      take:   limit,
    }),
    prisma.providerProfile.count({ where }),
  ]);

  return Response.json({
    providers: profiles,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
