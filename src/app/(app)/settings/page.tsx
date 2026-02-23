"use client";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [business, setBusiness] = useState<any>(null);
  const [form, setForm] = useState({ name: "", industry: "", timezone: "", googleReviewUrl: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(({ business }) => {
      if (business) {
        setBusiness(business);
        setForm({
          name: business.name,
          industry: business.industry,
          timezone: business.timezone,
          googleReviewUrl: business.googleReviewUrl ?? "",
        });
      }
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    const res = await fetch(`/api/businesses/${business.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error"); setSaving(false); return; }
    setBusiness({ ...business, ...form });
    setSaved(true); setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!business) return <div className="text-center py-12 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Business profile */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-5">Business Profile</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}
        {saved && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm mb-4">✅ Changes saved!</div>}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Business name</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Industry</label>
            <input className="input" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} />
          </div>
          <div>
            <label className="label">Timezone</label>
            <select className="input" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
              <option value="Asia/Nicosia">Asia/Nicosia (Cyprus)</option>
              <option value="Europe/Athens">Europe/Athens (Greece)</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Europe/Paris">Europe/Paris</option>
            </select>
          </div>
          <div>
            <label className="label">Google Review URL</label>
            <input className="input" type="url" value={form.googleReviewUrl} onChange={e => setForm({ ...form, googleReviewUrl: e.target.value })} placeholder="https://g.page/r/your-link/review" />
            <p className="text-xs text-gray-400 mt-1">Sent to customers after 4–5 star feedback.</p>
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      {/* Locations */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Locations</h2>
          <span className="text-xs text-gray-400">Plan: {business.billing?.plan ?? "—"} ({business.billing?.plan === "STARTER" ? "1 location" : business.billing?.plan === "PRO" ? "3 locations" : "10 locations"})</span>
        </div>
        {business.locations?.length === 0 ? (
          <p className="text-sm text-gray-400">No locations yet.</p>
        ) : (
          <div className="space-y-3">
            {business.locations?.map((loc: any) => (
              <div key={loc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{loc.name}</p>
                  {loc.address && <p className="text-xs text-gray-400">{loc.address}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Privacy section */}
      <div className="card p-6 bg-blue-50 border-blue-100">
        <h2 className="font-semibold text-blue-900 mb-3">🔒 Privacy & Compliance</h2>
        <div className="text-sm text-blue-800 space-y-2">
          <p>LocalBoost is built with privacy-by-design principles:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Customer consent is logged with a timestamp and source.</li>
            <li>SMS opt-outs (STOP) are processed automatically and immediately.</li>
            <li>Email unsubscribe links are included in every message.</li>
            <li>Customer data can be deleted at any time from the Customers page.</li>
            <li>An audit log records all actions for compliance purposes.</li>
          </ul>
          <p className="mt-3 text-xs">
            <em>Note: LocalBoost is a tool to help you manage customer communications. As the business owner, you remain the data controller. You are responsible for ensuring you have valid consent to contact your customers.</em>
          </p>
        </div>
      </div>
    </div>
  );
}
