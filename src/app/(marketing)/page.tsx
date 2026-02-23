import Link from "next/link";

const industries = [
  { icon: "✂️", name: "Barbers", benefit: "Eliminate ghost cuts. Send automated reminders & collect Google reviews." },
  { icon: "💅", name: "Nail Salons", benefit: "Fill your chair every hour. Automate follow-ups after every appointment." },
  { icon: "🏃", name: "Physios & PT", benefit: "Patients who miss sessions cost you time. Reminders keep them on track." },
  { icon: "🍽️", name: "Restaurants", benefit: "Reduce no-show reservations with SMS confirmations and review nudges." },
];

const steps = [
  { step: "1", title: "Sign Up & Connect", desc: "Create your account, add your business, paste your Google Review link. Done in 5 minutes." },
  { step: "2", title: "Add Customers & Appointments", desc: "Import your contact list via CSV or add manually. Create appointments from your portal." },
  { step: "3", title: "Automations Run Themselves", desc: "Reminder SMS/emails go out 24h and 2h before every appointment — no action needed." },
  { step: "4", title: "Reviews Roll In", desc: "After a great visit, happy customers receive a gentle nudge to leave a Google review." },
];

const testimonials = [
  { name: "Stavros K.", business: "Stavros Barbershop, Nicosia", quote: "My no-shows dropped by more than half in the first month. Incredible tool.", stars: 5 },
  { name: "Maria L.", business: "Lux Nails, Limassol", quote: "Our Google rating went from 4.1 to 4.7 in two months. Customers love the reminder texts.", stars: 5 },
  { name: "Dr. Nikos P.", business: "PhysioPlus Clinic, Paphos", quote: "So easy to set up. The automated feedback flow is genius — we now know when a patient is unhappy before they leave a bad review.", stars: 5 },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            🇨🇾 Built for Cyprus businesses
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            Fewer no-shows.<br />More Google Reviews.
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10">
            LocalBoost sends automated appointment reminders and post-visit review requests — so you can focus on running your business, not chasing customers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="bg-white text-brand-700 font-bold px-8 py-4 rounded-xl text-lg hover:bg-blue-50 transition-colors shadow-lg">
              Start free — no credit card →
            </Link>
            <Link href="/contact" className="border-2 border-white/50 text-white font-semibold px-8 py-4 rounded-xl text-lg hover:bg-white/10 transition-colors">
              Book a demo
            </Link>
          </div>
          <p className="text-blue-200 text-sm mt-6">14-day free trial · Cancel anytime · Setup in &lt;10 min</p>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────── */}
      <section className="bg-white py-16 px-4 border-b border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { stat: "↓ 60%", label: "Reduction in no-shows" },
            { stat: "+1.2★", label: "Average Google rating lift" },
            { stat: "3× more", label: "Review requests actioned" },
            { stat: "<10 min", label: "Setup time" },
          ].map(({ stat, label }) => (
            <div key={label}>
              <div className="text-3xl font-extrabold text-brand-700 mb-1">{stat}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">How LocalBoost works</h2>
            <p className="text-gray-500 mt-3 text-lg">Set it up once. Let it run forever.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map(({ step, title, desc }) => (
              <div key={step} className="card p-6">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-lg mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries ────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Built for service businesses</h2>
            <p className="text-gray-500 mt-3 text-lg">Any appointment-based business in Cyprus can benefit.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {industries.map(({ icon, name, benefit }) => (
              <div key={name} className="card p-6 hover:shadow-md transition-shadow">
                <div className="text-4xl mb-3">{icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{name}</h3>
                <p className="text-sm text-gray-500">{benefit}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/industries" className="text-brand-600 font-medium hover:underline">
              See all supported industries →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Automation flow visualised ─────────────────────── */}
      <section className="py-20 px-4 bg-brand-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">One appointment. Fully automated.</h2>
          <p className="text-gray-500 text-lg mb-10">From booking to Google review — without lifting a finger.</p>
          <div className="space-y-3">
            {[
              { time: "Booking", icon: "📅", label: "Appointment created" },
              { time: "T-24h", icon: "📩", label: "SMS + Email reminder sent with Confirm / Cancel links" },
              { time: "T-2h", icon: "📱", label: "Final SMS reminder" },
              { time: "Completed", icon: "✅", label: "Appointment marked complete" },
              { time: "T+1h", icon: "⭐", label: "Feedback request sent (1–5 stars)" },
              { time: "If 4-5★", icon: "🌟", label: "Google Review link sent automatically" },
              { time: "If 1-3★", icon: "🔒", label: "Private feedback captured — you're notified only" },
            ].map(({ time, icon, label }, i) => (
              <div key={i} className="flex items-center gap-4 bg-white rounded-xl px-5 py-4 shadow-sm text-left">
                <span className="text-2xl">{icon}</span>
                <div className="flex-1">
                  <span className="text-sm font-bold text-brand-600">{time}</span>
                  <p className="text-gray-700 text-sm mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Cyprus businesses love LocalBoost</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ name, business, quote, stars }) => (
              <div key={name} className="card p-6">
                <div className="text-yellow-400 text-lg mb-3">{"★".repeat(stars)}</div>
                <p className="text-gray-600 italic mb-4">"{quote}"</p>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{name}</div>
                  <div className="text-gray-400 text-xs">{business}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-brand-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to stop losing money to no-shows?</h2>
          <p className="text-blue-200 text-lg mb-8">
            Join local businesses across Cyprus already using LocalBoost. Start your 14-day free trial today.
          </p>
          <Link href="/signup" className="bg-white text-brand-700 font-bold px-10 py-4 rounded-xl text-lg hover:bg-blue-50 transition-colors inline-block">
            Get started free →
          </Link>
          <p className="text-blue-300 text-sm mt-4">No credit card required · Cancel anytime</p>
        </div>
      </section>
    </>
  );
}
