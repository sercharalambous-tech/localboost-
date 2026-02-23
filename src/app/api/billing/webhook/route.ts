import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { BillingPlan, BillingStatus } from "@prisma/client";
import Stripe from "stripe";


// Parse the plan from Stripe metadata or price lookup
function parsePlan(str?: string): BillingPlan {
  const map: Record<string, BillingPlan> = { STARTER: "STARTER", PRO: "PRO", PREMIUM: "PREMIUM" };
  return map[str?.toUpperCase() ?? ""] ?? "STARTER";
}

function parseStatus(str: Stripe.Subscription.Status): BillingStatus {
  const map: Record<string, BillingStatus> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELLED",
    incomplete: "INCOMPLETE",
    incomplete_expired: "CANCELLED",
    unpaid: "PAST_DUE",
  };
  return map[str] ?? "INCOMPLETE";
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const businessId = session.metadata?.businessId;
        const plan = parsePlan(session.metadata?.plan);
        if (!businessId) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

        await prisma.billing.upsert({
          where: { businessId },
          update: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            plan,
            status: parseStatus(subscription.status),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
          create: {
            businessId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            plan,
            status: parseStatus(subscription.status),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            usagePeriodStart: new Date(),
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const businessId = subscription.metadata?.businessId;
        if (!businessId) break;

        const plan = parsePlan(subscription.metadata?.plan);
        await prisma.billing.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            plan,
            status: parseStatus(subscription.status),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.billing.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: "CANCELLED" },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await prisma.billing.updateMany({
            where: { stripeSubscriptionId: invoice.subscription as string },
            data: { status: "PAST_DUE" },
          });
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook]", err);
    return Response.json({ error: "Webhook handler error" }, { status: 500 });
  }
}
