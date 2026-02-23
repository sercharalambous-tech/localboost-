"use client";
import { useEffect, useState, useCallback } from "react";
import { formatDateTime } from "@/lib/utils";

const STATUSES = ["SCHEDULED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;
type Status = typeof STATUSES[number];

const statusBadge: Record<Status, string> = {
  SCHEDULED: "badge-blue",
  CONFIRMED: "badge-green",
  CANCELLED: "badge-gray",
  COMPLETED: "badge-green",
  NO_SHOW: "badge-red",
};

const statusLabel: Record<Status, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
};

export default function AppointmentsPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedApt, setSelectedApt] = useState<any | null>(null);

  const [form, setForm] = useState({
    customerId: "", serviceName: "", startAt: "", endAt: "", notes: "", locationId: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async (bId: string, pg = 1, status = "") => {
    setLoading(true);
    const url = `/api/appointments?businessId=${bId}&page=${pg}${status ? `&status=${status}` : ""}`;
    const data = await fetch(url).then(r => r.json());
    setAppointments(data.appointments ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(({ business }) => {
      if (business) {
        setBusinessId(business.id);
        load(business.id, 1, "");
        fetch(`/api/customers?businessId=${business.id}&limit=100`).then(r => r.json()).then(d => setCustomers(d.customers ?? []));
      }
    });
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("new")) setShowNew(true);
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveError("");
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, businessId }),
    });
    const data = await res.json();
    if (!res.ok) { setSaveError(data.error ?? "Error"); setSaving(false); return; }
    setShowNew(false);
    setForm({ customerId: "", serviceName: "", startAt: "", endAt: "", notes: "", locationId: "" });
    if (businessId) load(businessId, page, filterStatus);
    setSaving(false);
  }

  async function updateStatus(id: string, status: Status) {
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (businessId) load(businessId, page, filterStatus);
    setSelectedApt(null);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ New appointment</button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setFilterStatus(""); if (businessId) load(businessId, 1, ""); }}
          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${!filterStatus ? "bg-brand-600 text-white border-brand-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
          All
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => { setFilterStatus(s); if (businessId) load(businessId, 1, s); }}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${filterStatus === s ? "bg-brand-600 text-white border-brand-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
            {statusLabel[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Customer", "Service", "Date & Time", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="text-3xl mb-3">📅</div>
                    <p className="text-gray-500 mb-3">No appointments yet.</p>
                    <button onClick={() => setShowNew(true)} className="btn-primary text-sm">Add first appointment →</button>
                  </td>
                </tr>
              ) : appointments.map((apt: any) => (
                <tr key={apt.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedApt(apt)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{apt.customer.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{apt.serviceName}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDateTime(apt.startAt)}</td>
                  <td className="px-4 py-3">
                    <span className={statusBadge[apt.status as Status]}>{statusLabel[apt.status as Status]}</span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {apt.status === "SCHEDULED" || apt.status === "CONFIRMED" ? (
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(apt.id, "COMPLETED")}
                          className="text-xs text-green-600 hover:underline">Complete</button>
                        <button onClick={() => updateStatus(apt.id, "NO_SHOW")}
                          className="text-xs text-orange-500 hover:underline">No-show</button>
                        <button onClick={() => updateStatus(apt.id, "CANCELLED")}
                          className="text-xs text-red-500 hover:underline">Cancel</button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing page {page}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => { const p = page - 1; setPage(p); if (businessId) load(businessId, p, filterStatus); }}
                className="btn-secondary text-xs py-1">← Prev</button>
              <button disabled={page * 20 >= total} onClick={() => { const p = page + 1; setPage(p); if (businessId) load(businessId, p, filterStatus); }}
                className="btn-secondary text-xs py-1">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* New appointment modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="card p-8 max-w-lg w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-6">New Appointment</h2>
            {saveError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{saveError}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Customer *</label>
                <select className="input" required value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}>
                  <option value="">Select customer…</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Service *</label>
                <input className="input" required value={form.serviceName} onChange={e => setForm({ ...form, serviceName: e.target.value })} placeholder="Haircut, Massage, etc." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start time *</label>
                  <input className="input" type="datetime-local" required value={form.startAt} onChange={e => setForm({ ...form, startAt: e.target.value })} />
                </div>
                <div>
                  <label className="label">End time</label>
                  <input className="input" type="datetime-local" value={form.endAt} onChange={e => setForm({ ...form, endAt: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input h-20 resize-none" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
