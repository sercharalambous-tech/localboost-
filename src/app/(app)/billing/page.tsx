"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const PLANS = [
  { key: "STARTER", label: "Starter", price: "€19/mo", locations: 1, messages: 200, seats: 1 },
  { key: "PRO", label: "Pro", price: "€49/mo", locations: 3, messages: 1000, seats: 3, popular: true },
  { key: "PREMIUM", label: "Premium", price: "€99/mo", locations: 10, messages: 5000, seats: 10 },
];

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [billing, setBilling] = useState<any | null>(null);
  const [limits, setLimits] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(({ business }) => {
      if (!business) return;
      setBusinessId(business.id);
      fetch(`/api/billing?businessId=${business.id}`).then(r => r.json()).then(({ billing, limits }) => {
        setBilling(billing);
        setLimits(limits);
        setLoading(false);
      });
    });
  }, []);

  async function handleUpgrade(planKey: string) {
    setUpgrading(planKey);
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, plan: planKey }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setUpgrading(null);
  }

  async function handlePortal() {
    setPortalLoading(true);
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setPortalLoading(false);
  }

  const usagePercent = billing && limits ? Math.round((billing.messagesUsedThisMonth / limits.messagesPerMonth) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your subscription and usage.</p>
      </div>

      {searchParams.get("success") && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 text-sm">
          🎉 Payment successful! Your subscription is now active.
        </div>
      )}

      {/* Current plan */}
      {billing && (
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">Current plan</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-2xl font-extrabold text-brand-700">{billing.plan}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  billing.status === "ACTIVE" || billing.status === "TRIALING" ? "bg-green-100 text-green-700" :
                  billing.status === "PAST_DUE" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {billing.status}
                </span>
              </div>
              {billing.currentPeriodEnd && (
                <p className="text-sm text-gray-500 mt-1">
                  Renews {new Date(billing.currentPeriodEnd).toLocaleDateString("en-CY", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            {billing.stripeCustomerId && (
              <button onClick={handlePortal} disabled={portalLoading} className="btn-secondary text-sm">
                {portalLoading ? "Loading…" : "Manage subscription →"}
              </button>
            )}
          </div>

          {/* Usage bar */}
          {limits && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">Messages this month</span>
                <span className="font-semibold text-gray-900">{billing.messagesUsedThisMonth} / {limits.messagesPerMonth}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${usagePercent >= 100 ? "bg-red-500" : usagePercent >= 80 ? "bg-amber-400" : "bg-green-500"}`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              {usagePercent >= 100 && (
                <p className="text-sm text-red-600 mt-2 font-medium">
                  ⚠️ You've reached your monthly limit. Sending is paused. Please upgrade to continue.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Plan comparison */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-4">Change plan</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = billing?.plan === plan.key;
            return (
              <div key={plan.key} className={`card p-6 relative ${plan.popular ? "border-brand-500 border-2" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <h3 className="font-bold text-gray-900 text-lg">{plan.label}</h3>
                <p className="text-2xl font-extrabold text-brand-700 mt-1 mb-4">{plan.price}</p>
                <ul className="space-y-2 text-sm text-gray-600 mb-5">
                  <li>✓ {plan.locations} location{plan.locations > 1 ? "s" : ""}</li>
                  <li>✓ {plan.messages.toLocaleString()} messages/month</li>
                  <li>✓ {plan.seats} seat{plan.seats > 1 ? "s" : ""}</li>
                </ul>
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={isCurrent || upgrading === plan.key}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    isCurrent ? "bg-gray-100 text-gray-400 cursor-default" :
                    plan.popular ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  {isCurrent ? "Current plan" : upgrading === plan.key ? "Redirecting…" : "Switch to this plan"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-5 text-sm text-gray-500">
        <p>💳 Billing is handled securely by Stripe. We never store your card details. Cancel anytime with no penalty.</p>
      </div>
    </div>
  );
}
