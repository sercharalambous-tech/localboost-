"use client";
import { useState, useEffect } from "react";

interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

interface ServiceFormData {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
}

export default function ServicesPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [services, setServices]     = useState<Service[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [form, setForm]             = useState<ServiceFormData>({
    name: "", description: "", durationMinutes: 30, price: 0,
  });

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => {
      if (d.business?.id) {
        setBusinessId(d.business.id);
        loadServices(d.business.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function loadServices(bid: string) {
    setLoading(true);
    const r = await fetch(`/api/services?businessId=${bid}`);
    const d = await r.json();
    setServices(d.services ?? []);
    setLoading(false);
  }

  function openCreate() {
    setEditId(null);
    setForm({ name: "", description: "", durationMinutes: 30, price: 0 });
    setError(null);
    setShowForm(true);
  }

  function openEdit(s: Service) {
    setEditId(s.id);
    setForm({ name: s.name, description: s.description ?? "", durationMinutes: s.durationMinutes, price: Number(s.price) });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);
    setError(null);
    try {
      const url    = editId ? `/api/services/${editId}` : "/api/services";
      const method = editId ? "PATCH" : "POST";
      const body   = editId ? form : { ...form, businessId };
      const r      = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d      = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Save failed");
      setShowForm(false);
      loadServices(businessId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Service) {
    await fetch(`/api/services/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    if (businessId) loadServices(businessId);
  }

  async function deleteService(id: string) {
    if (!confirm("Delete this service?")) return;
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (businessId) loadServices(businessId);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Services</h1>
          <p className="text-gray-500 text-sm mt-1">Manage the services available for online booking</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
          + Add service
        </button>
      </div>

      {/* Service Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">{editId ? "Edit service" : "New service"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="e.g. ÎÎ½Î´ÏÎ¹ÎºÏ ÎÎ¿ÏÏÎµÎ¼Î±"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  placeholder="Optional short description"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min) *</label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (â¬) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.50"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {saving ? "Savingâ¦" : "Save service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <div className="text-4xl mb-3">ð</div>
          <p className="text-gray-500 text-sm">No services yet. Add your first one to enable online booking.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <div key={s.id} className={`flex items-center justify-between p-4 bg-white rounded-xl border ${s.isActive ? "border-gray-100" : "border-gray-100 opacity-50"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">{s.name}</span>
                  {!s.isActive && (
                    <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Hidden</span>
                  )}
                </div>
                {s.description && <p className="text-gray-400 text-xs mt-0.5 truncate">{s.description}</p>}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500">{s.durationMinutes} min</span>
                  <span className="text-xs font-medium text-gray-700">â¬{Number(s.price).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => toggleActive(s)} className="text-xs text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  {s.isActive ? "Hide" : "Show"}
                </button>
                <button onClick={() => openEdit(s)} className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  Edit
                </button>
                <button onClick={() => deleteService(s.id)} className="text-xs text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
