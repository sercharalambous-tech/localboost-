"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const INDUSTRIES = ["Barber", "Hair Salon", "Nail Salon", "Physio", "Personal Trainer", "Yoga/Pilates", "Dental", "Medical", "Restaurant", "Other"];
const TIMEZONES = ["Asia/Nicosia", "Europe/Athens", "Europe/London", "Europe/Paris"];

const steps = ["Business Info", "Messaging", "Review Link", "Done!"];

export default function OnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan") ?? "STARTER";
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    industry: "Barber",
    timezone: "Asia/Nicosia",
    locationName: "Main Location",
    locationAddress: "",
    locationPhone: "",
    googleReviewUrl: "",
    channels: ["SMS", "EMAIL"],
  });

  async function handleFinish() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, plan }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); setLoading(false); return; }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again."); setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">🚀</div>
          <h1 className="text-2xl font-bold text-gray-900">Set up LocalBoost</h1>
          <p className="text-gray-500 text-sm mt-1">Takes less than 5 minutes</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? "bg-green-500 text-white" : i === step ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? "text-brand-600 font-medium" : "text-gray-400"}`}>{s}</span>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 w-4 sm:w-8 mx-1 ${i < step ? "bg-green-400" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">{error}</div>}

        <div className="card p-8">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tell us about your business</h2>
              <div>
                <label className="label">Business name *</label>
                <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Stavros Barbershop" />
              </div>
              <div>
                <label className="label">Industry</label>
                <select className="input" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Timezone</label>
                <select className="input" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
                  {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Location name</label>
                <input className="input" value={form.locationName} onChange={e => setForm({ ...form, locationName: e.target.value })} />
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input" value={form.locationAddress} onChange={e => setForm({ ...form, locationAddress: e.target.value })} placeholder="15 Ledra Street, Nicosia" />
              </div>
              <div>
                <label className="label">Phone number</label>
                <input className="input" type="tel" value={form.locationPhone} onChange={e => setForm({ ...form, locationPhone: e.target.value })} placeholder="+357 22..." />
              </div>
              <button disabled={!form.name} onClick={() => setStep(1)} className="btn-primary w-full mt-2">Continue →</button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Choose your messaging channels</h2>
              <p className="text-sm text-gray-500 mb-4">Select how you'd like to reach your customers. You can change this later.</p>
              {["SMS", "EMAIL"].map(ch => (
                <label key={ch} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${form.channels.includes(ch) ? "border-brand-500 bg-brand-50" : "border-gray-200"}`}>
                  <input type="checkbox" checked={form.channels.includes(ch)} onChange={e => {
                    setForm({ ...form, channels: e.target.checked ? [...form.channels, ch] : form.channels.filter(c => c !== ch) });
                  }} className="rounded" />
                  <div>
                    <div className="font-medium text-gray-900">{ch === "SMS" ? "📱 SMS" : "📧 Email"}</div>
                    <div className="text-sm text-gray-500">{ch === "SMS" ? "Best open rates. Requires Twilio setup." : "Great for detailed reminders. Requires Postmark setup."}</div>
                  </div>
                </label>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(0)} className="btn-secondary flex-1">← Back</button>
                <button onClick={() => setStep(2)} className="btn-primary flex-1">Continue →</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Add your Google Review link</h2>
              <p className="text-sm text-gray-500">This link will be sent to customers after positive feedback. You can find it in your Google Business Profile.</p>
              <div>
                <label className="label">Google Review URL</label>
                <input className="input" type="url" value={form.googleReviewUrl} onChange={e => setForm({ ...form, googleReviewUrl: e.target.value })} placeholder="https://g.page/r/your-business/review" />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <strong>How to find your link:</strong> Go to your Google Business Profile → Get more reviews → Copy link.
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1">Continue →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="text-5xl">🎉</div>
              <h2 className="text-xl font-bold text-gray-900">You're all set!</h2>
              <p className="text-gray-500 text-sm">LocalBoost is ready to start automating your reminders and review requests.</p>
              <ul className="text-sm text-left space-y-2 bg-gray-50 rounded-lg p-4">
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Business profile created</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Default templates loaded (EN + EL)</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Automation rules configured</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">→</span> Next: Add your first customers and appointments</li>
              </ul>
              <button onClick={handleFinish} disabled={loading} className="btn-primary w-full py-3 mt-2">
                {loading ? "Setting up…" : "Go to Dashboard →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
