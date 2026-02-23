"use client";
import { useEffect, useState, useCallback } from "react";

export default function CustomersPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", consentSms: false, consentEmail: false, consentSource: "manual" });

  const load = useCallback(async (bId: string, pg = 1, search = "") => {
    setLoading(true);
    const data = await fetch(`/api/customers?businessId=${bId}&page=${pg}&q=${search}`).then(r => r.json());
    setCustomers(data.customers ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(({ business }) => {
      if (business) { setBusinessId(business.id); load(business.id); }
    });
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("new")) setShowNew(true);
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveError("");
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, businessId }),
    });
    const data = await res.json();
    if (!res.ok) { setSaveError(data.error ?? "Error"); setSaving(false); return; }
    setShowNew(false);
    setForm({ fullName: "", phone: "", email: "", consentSms: false, consentEmail: false, consentSource: "manual" });
    if (businessId) load(businessId, 1, "");
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer? Their data will be anonymised.")) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (businessId) load(businessId, page, q);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-1">{total} contacts</p>
        </div>
        <div className="flex gap-3">
          <label className="btn-secondary text-sm cursor-pointer">
            📥 Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              const text = await file.text();
              const res = await fetch("/api/customers/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId, csv: text }),
              });
              const data = await res.json();
              alert(`Imported ${data.imported} customers.`);
              if (businessId) load(businessId, 1, "");
            }} />
          </label>
          <button onClick={() => setShowNew(true)} className="btn-primary">+ Add customer</button>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search name, email, phone…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (businessId) load(businessId, 1, e.target.value);
          }}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Name", "Phone", "Email", "SMS consent", "Email consent", "Opted out", "Appointments", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="text-3xl mb-3">👥</div>
                    <p className="text-gray-500 mb-3">No customers yet. Add your first or import a CSV.</p>
                    <button onClick={() => setShowNew(true)} className="btn-primary text-sm">Add first customer →</button>
                  </td>
                </tr>
              ) : customers.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={c.consentSms ? "badge-green" : "badge-gray"}>{c.consentSms ? "Yes" : "No"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={c.consentEmail ? "badge-green" : "badge-gray"}>{c.consentEmail ? "Yes" : "No"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.optedOutSms && <span className="badge-red mr-1">SMS</span>}
                    {c.optedOutEmail && <span className="badge-red">Email</span>}
                    {!c.optedOutSms && !c.optedOutEmail && "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c._count?.appointments ?? 0}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 25 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Page {page}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => { const p = page - 1; setPage(p); if (businessId) load(businessId, p, q); }} className="btn-secondary text-xs py-1">← Prev</button>
              <button disabled={page * 25 >= total} onClick={() => { const p = page + 1; setPage(p); if (businessId) load(businessId, p, q); }} className="btn-secondary text-xs py-1">Next →</button>
            </div>
          </div>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="card p-8 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Add Customer</h2>
            {saveError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{saveError}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Full name *</label>
                <input className="input" required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input className="input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+357 99..." />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <strong>Consent confirmation</strong><br />
                By adding this customer, you confirm that you have their consent to send appointment reminders via the selected channels.
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.consentSms} onChange={e => setForm({ ...form, consentSms: e.target.checked })} className="rounded" />
                  <span className="text-sm text-gray-700">SMS consent</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.consentEmail} onChange={e => setForm({ ...form, consentEmail: e.target.checked })} className="rounded" />
                  <span className="text-sm text-gray-700">Email consent</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Add customer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
