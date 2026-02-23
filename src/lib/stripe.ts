import Stripe from "stripe";
import { BillingPlan } from "@prisma/client";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

// ── Plan limits ────────────────────────────────────────────
export const PLAN_LIMITS: Record<BillingPlan, { locations: number; messagesPerMonth: number; seats: number }> = {
  STARTER: { locations: 1, messagesPerMonth: 200, seats: 1 },
  PRO: { locations: 3, messagesPerMonth: 1000, seats: 3 },
  PREMIUM: { locations: 10, messagesPerMonth: 5000, seats: 10 },
};

// ── Price map (resolved at runtime from env) ──────────────
export function getPriceId(plan: BillingPlan): string {
  const map: Record<BillingPlan, string | undefined> = {
    STARTER: process.env.STRIPE_PRICE_STARTER,
    PRO: process.env.STRIPE_PRICE_PRO,
    PREMIUM: process.env.STRIPE_PRICE_PREMIUM,
  };
  const priceId = map[plan];
  if (!priceId) throw new Error(`No Stripe price ID configured for plan: ${plan}`);
  return priceId;
}

// ── Create Stripe checkout session ───────────────────────
export async function createCheckoutSession({
  plan,
  stripeCustomerId,
  businessId,
  successUrl,
  cancelUrl,
}: {
  plan: BillingPlan;
  stripeCustomerId?: string;
  businessId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: getPriceId(plan), quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: { businessId, plan },
    subscription_data: {
      metadata: { businessId, plan },
    },
  };

  if (stripeCustomerId) {
    sessionParams.customer = stripeCustomerId;
  }

  return stripe.checkout.sessions.create(sessionParams);
}

// ── Create billing portal session ───────────────────────
export async function createPortalSession({
  stripeCustomerId,
  returnUrl,
}: {
  stripeCustomerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
}

// ── Plan name display ──────────────────────────────────────
export const PLAN_PRICES: Record<BillingPlan, { monthly: string; label: string }> = {
  STARTER: { monthly: "€19", label: "Starter" },
  PRO: { monthly: "€49", label: "Pro" },
  PREMIUM: { monthly: "€99", label: "Premium" },
};
