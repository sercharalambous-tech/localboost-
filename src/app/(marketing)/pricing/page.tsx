import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pricing" };

const plans = [
  {
    name: "Starter",
    price: "€19",
    period: "/month",
    description: "Perfect for solo operators with one location.",
    features: [
      "1 business location",
      "200 messages/month (SMS + Email)",
      "Automated reminders (24h & 2h)",
      "Feedback collection",
      "Google Review automation",
      "English & Greek templates",
      "Email support",
    ],
    cta: "Start free trial",
    highlight: false,
    planKey: "STARTER",
  },
  {
    name: "Pro",
    price: "€49",
    period: "/month",
    description: "For growing businesses with multiple locations.",
    features: [
      "Up to 3 locations",
      "1,000 messages/month",
      "Everything in Starter",
      "SMS + Email channels",
      "Custom templates",
      "Dashboard analytics",
      "Priority email support",
    ],
    cta: "Start free trial",
    highlight: true,
    planKey: "PRO",
  },
  {
    name: "Premium",
    price: "€99",
    period: "/month",
    description: "Multi-location teams and high-volume businesses.",
    features: [
      "Up to 10 locations",
      "5,000 messages/month",
      "Everything in Pro",
      "Multiple team seats",
      "Audit log & compliance exports",
      "Phone support",
      "Dedicated onboarding call",
    ],
    cta: "Start free trial",
    highlight: false,
    planKey: "PREMIUM",
  },
];

export default function PricingPage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Simple, honest pricing</h1>
          <p className="text-gray-500 text-lg">No hidden fees. No per-message charges within your plan. Cancel anytime.</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-green-100 text-green-800 text-sm font-medium px-4 py-2 rounded-full">
            ✅ 14-day free trial on all plans — no credit card required
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-2xl border-2 p-8 relative ${plan.highlight ? "border-brand-600 shadow-xl shadow-brand-100" : "border-gray-200 shadow-sm"}`}>
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
                  Most popular
                </div>
              )}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 mb-1">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500 mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>

              <Link
                href={`/signup?plan=${plan.planKey}`}
                className={`block text-center py-3 px-6 rounded-xl font-semibold transition-colors ${plan.highlight ? "bg-brand-600 text-white hover:bg-brand-700" : "bg-gray-100 text-gray-900 hover:bg-gray-200"}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="card p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">What happens if I exceed my message limit?</h3>
          <p className="text-gray-500 text-base max-w-2xl mx-auto">
            LocalBoost will automatically pause sending and show you a clear upgrade prompt in your dashboard. No surprise charges — ever. Simply upgrade to the next plan, and sending resumes immediately.
          </p>
        </div>

        <div className="mt-14 text-center">
          <p className="text-gray-500 mb-3">Not sure which plan is right for you?</p>
          <Link href="/contact" className="btn-primary">Book a free 15-min demo →</Link>
        </div>
      </div>
    </div>
  );
}
