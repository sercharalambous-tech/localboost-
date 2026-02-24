/**
 * LocalBoost Provider Helpers
 * Utilities for provider profile management and rating caching.
 */

import { prisma } from "@/lib/prisma";
import { IndustryCategory } from "@prisma/client";

// ââ Industry labels (Greek) ââââââââââââââââââââââââââââââ
export const INDUSTRY_LABELS: Record<IndustryCategory, string> = {
  BARBER_MEN:       "ÎÎ¿ÏÏÎµÎ¯Î¿ (ÎÎ½Î´ÏÏÎ½)",
  HAIR_SALON_WOMEN: "ÎÎ¿Î¼Î¼ÏÏÎ®ÏÎ½Î¿ (ÎÏÎ½Î±Î¹ÎºÏÎ½)",
  HAIR_SALON_UNISEX:"ÎÎ¿Î¼Î¼ÏÏÎ®ÏÎ½Î¿ (Unisex)",
  AESTHETICIAN:     "ÎÎ¹ÏÎ¸Ï;ÏÎ¹ÎºÎ®",
  LASER_CLINIC:     "Laser",
  MASSAGE:          "Massage / ÎÎµÏÎ±ÏÎµÎ¯Î±",
  PERSONAL_TRAINER: "Personal Trainer",
  PILATES:          "Pilates",
  YOGA:             "Yoga",
  PHYSIOTHERAPY:    "Î¦ÏÏÎ¹Î¿Î¸ÎµÏn±ÏÎµÎ¯Î±",
  NAIL_SALON:       "ÎÏÏÎ¹Î± / Nail Art",
  TATTOO:           "Tattoo & Piercing",
  NUTRITION:        "ÎÎ¹Î±ÏÏÎ¿ÏÎ¿Î»ÏÎ³Î¿Ï",
  MAKEUP_ARTIST:    "Make-up Artist",
  OSTEOPATH:        "ÎÏÏÎµÎ¿ÏN±Î¸Î·ÏÎ¹ÎºÎ®",
  PSYCHOLOGIST:     "Î¨ÏÏÎ¿Î»ÏÎ³Î¿Ï / Coach",
  DENTAL:           "ÎÎ´Î¿Î½ÏÎ¯Î±ÏÏÎ¿Ï",
  OTHER:            "ÎÎ»Î»Î¿",
};

export const INDUSTRY_ICONS: Record<IndustryCategory, string> = {
  BARBER_MEN:       "âï¸",
  HAIR_SALON_WOMEN: "ðââï¸",
  HAIR_SALON_UNISEX:"ð",
  AESTHETICIAN:     "â¨",
  LASER_CLINIC:     "â¡",
  MASSAGE:          "ð",
  PERSONAL_TRAINER: "ðï¸",
  PILATES:          "ð§",
  YOGA:             "ðª·",
  PHYSIOTHERAPY:    "ð©º",
  NAIL_SALON:       "ð",
  TATTOO:           "ð¨",
  NUTRITION:        "ð¥",
  MAKEUP_ARTIST:    "ð",
  OSTEOPATH:        "ð¦´",
  PSYCHOLOGIST:     "ð§ ",
  DENTAL:           "ð¦·",
  OTHER:            "ð¢",
};

// ââ Slug generation ââââââââââââââââââââââââââââââââââââââ
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

// ââ Rating cache updater ââââââââââââââââââââââââââââââââââ
export async function refreshProviderRating(businessId: string): Promise<void> {
  const profile = await prisma.providerProfile.findUnique({
    where: { businessId },
  });
  if (!profile) return;

  const result = await prisma.feedback.aggregate({
    where: { businessId, submittedAt: { not: null } },
    _avg:   { rating: true },
    _count: { rating: true },
  });

  await prisma.providerProfile.update({
    where: { businessId },
    data: {
      avgRating:   result._avg.rating  ?? 0,
      reviewCount: result._count.rating ?? 0,
    },
  });
}

export function getPriceRange(services: { price: number | string }[]): string {
  if (services.length === 0) return "â";
  const prices = services.map((s) => Number(s.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `â¬${min}`;
  return `â¬${min}-â¬${max}`;
}

export const DAY_LABELS = ["ÎÏÏ", "ÎÎµÏ", "Î¤ÏÎ¹Ï", "Î¤ÎµÏ", "Î ÎµÎ¼", "Î Î±Ï", "Î£Î±Î²"];
export const DAY_LABELS_FULL = ["ÎÏÏÎ¹Î±ÎºÎ®", "ÎÎµÏÏÎ­ÏÎ±", "Î¤ÏÎ¯ÏÎ·", "Î¤ÎµÏÎ¬ÏÏÎ·", "Î Î­Î¼ÏÏÎ·", "Î Î±ÏÎ±ÏÎºÎµÏÎ®", "Î£Î¬Î²Î²Î±ÏÎ¿"];
