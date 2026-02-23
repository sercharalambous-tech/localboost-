"use client";
import { useState } from "react";
import type { Metadata } from "next";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", business: "", message: "", type: "demo" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // In a real deployment, POST to a contact form API endpoint
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="py-20 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Get in touch</h1>
          <p className="text-gray-500 text-lg">Book a free 15-minute demo or ask us anything.</p>
        </div>

        {sent ? (
          <div className="card p-10 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Message sent!</h2>
            <p className="text-gray-500">We'll be in touch within 1 business day. Talk soon!</p>
          </div>
        ) : (
          <div className="card p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Your name *</label>
                  <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Stavros Kyriakides" />
                </div>
                <div>
                  <label className="label">Email address *</label>
                  <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="stavros@mybusiness.com" />
                </div>
              </div>
              <div>
                <label className="label">Business name</label>
                <input className="input" value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} placeholder="Stavros Barbershop" />
              </div>
              <div>
                <label className="label">I'd like to…</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="demo">Book a free demo</option>
                  <option value="question">Ask a general question</option>
                  <option value="support">Get support</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Message *</label>
                <textarea className="input h-28 resize-none" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us about your business and what you're looking for..." />
              </div>
              <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                {loading ? "Sending…" : "Send message →"}
              </button>
            </form>
          </div>
        )}

        <div className="mt-10 grid sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: "📧", label: "Email", value: "hello@localboost.app" },
            { icon: "💬", label: "Response time", value: "Within 1 business day" },
            { icon: "🇨🇾", label: "Based in", value: "Cyprus" },
          ].map(({ icon, label, value }) => (
            <div key={label} className="card p-5">
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
              <div className="text-sm font-medium text-gray-700">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
