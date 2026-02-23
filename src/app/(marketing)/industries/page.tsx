import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Industries" };

const industries = [
  {
    icon: "✂️", name: "Barbers & Hair Salons",
    description: "The average barbershop loses €400+/month to no-shows. LocalBoost sends automatic SMS reminders with confirm/cancel links, so your chair is never empty when it shouldn't be.",
    benefits: ["Reduce ghost appointments", "Collect Google reviews automatically", "Bilingual templates (EN/EL)", "Works with walk-in tracking too"],
  },
  {
    icon: "💅", name: "Nail Salons & Beauty",
    description: "Beauty appointment slots are precious. A missed booking can't be recovered. LocalBoost keeps your clients engaged and your schedule full.",
    benefits: ["24h + 2h SMS/Email reminders", "Post-visit 5-star review funnel", "Private feedback for unhappy clients", "Simple customer import from spreadsheet"],
  },
  {
    icon: "🏃", name: "Physiotherapists & Personal Trainers",
    description: "Healthcare and fitness clients often miss sessions due to busy schedules. A well-timed reminder is the difference between a missed payment and a completed session.",
    benefits: ["Patient-friendly reminder copy", "GDPR-compliant consent tracking", "Reduce cancellation rates", "Track no-show patterns over time"],
  },
  {
    icon: "🧘", name: "Yoga & Pilates Studios",
    description: "Class-based businesses need consistent attendance. Use LocalBoost to confirm bookings, track completions, and build your online reputation.",
    benefits: ["Class-based appointment support", "Automated review collection after class", "Feedback loop for instructors", "Multi-location support"],
  },
  {
    icon: "🦷", name: "Dental & Medical Clinics",
    description: "Missed dental or medical appointments are a safety and revenue concern. Automated reminders improve patient outcomes and clinic revenue simultaneously.",
    benefits: ["Consent-first design", "Bilingual patient communication", "Soft opt-out (STOP / unsubscribe)", "Audit log for compliance"],
  },
  {
    icon: "🍽️", name: "Restaurants & Tavernas",
    description: "Table reservations that don't show up are pure loss. Confirm bookings automatically and invite satisfied diners to share their experience on Google.",
    benefits: ["Reservation confirmation links", "Post-dinner review requests", "Works for special events and set menus", "No app download required for guests"],
  },
];

export default function IndustriesPage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Built for every appointment-based business</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Whether you run a barbershop in Nicosia or a physio clinic in Limassol, LocalBoost works for you.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {industries.map(({ icon, name, description, benefits }) => (
            <div key={name} className="card p-8 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">{icon}</div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">{name}</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">{description}</p>
              <ul className="space-y-2">
                {benefits.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-green-500">✓</span> {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 text-center">
          <Link href="/signup" className="btn-primary text-base px-8 py-4">
            Start your free trial →
          </Link>
          <p className="text-gray-400 text-sm mt-3">14 days free · No credit card</p>
        </div>
      </div>
    </div>
  );
}
