"use client";
import { useEffect, useState } from "react";

const VARIABLE_HINTS = "{customer_name}, {business_name}, {appointment_date}, {appointment_time}, {service_name}, {confirm_url}, {cancel_url}, {feedback_url}, {review_url}, {unsubscribe_url}";

export default function TemplatesPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);

  const [form, setForm] = useState({
    channel: "SMS", language: "EN", name: "", subject: "", body: "",
  });

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(({ business }) => {
      if (!business) return;
      setBusinessId(business.id);
      fetch(`/api/templates?businessId=${business.id}`)
        .then(r => r.json())
        .then(d => { setTemplates(d.templates ?? []); setLoading(false); });
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `/api/templates/${editing.id}` : "/api/templates";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, businessId }),
    });
    const data = await res.json();
    if (editing) {
      setTemplates(prev => prev.map(t => t.id === editing.id ? data.template : t));
    } else {
      setTemplates(prev => [...prev, data.template]);
    }
    setShowNew(false); setEditing(null);
    setSaving(false);
  }

  async function handleTestSend() {
    if (!testEmail || !editing) return;
    setTestSending(true);
    await fetch("/api/templates/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: editing.id, email: testEmail, businessId }),
    });
    setTestSending(false);
    alert(`Test ${editing.channel === "EMAIL" ? "email" : "SMS"} sent to ${testEmail}`);
  }

  function openEdit(t: any) {
    setEditing(t);
    setForm({ channel: t.channel, language: t.language, name: t.name, subject: t.subject ?? "", body: t.body });
    setShowNew(true);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Customise the messages sent to your customers.</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ channel: "SMS", language: "EN", name: "", subject: "", body: "" }); setShowNew(true); }} className="btn-primary">
          + New template
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="text-3xl mb-3">📝</div>
          <p className="text-gray-500 mb-3">No templates yet. Default templates are used automatically.</p>
          <button onClick={() => setShowNew(true)} className="btn-primary text-sm">Create custom template</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {templates.map((t: any) => (
            <div key={t.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400">{t.channel} · {t.language}</span>
                  <h3 className="font-semibold text-gray-900 mt-0.5">{t.name}</h3>
                </div>
                {t.isDefault && <span className="badge-blue text-xs">Default</span>}
              </div>
              <p className="text-sm text-gray-500 line-clamp-3">{t.body}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(t)} className="btn-secondary text-xs py-1">Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="card p-8 max-w-2xl w-full my-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{editing ? "Edit Template" : "New Template"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Channel</label>
                  <select className="input text-sm" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>
                    <option value="SMS">SMS</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>
                <div>
                  <label className="label">Language</label>
                  <select className="input text-sm" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
                    <option value="EN">English</option>
                    <option value="EL">Greek</option>
                  </select>
                </div>
                <div>
                  <label className="label">Name</label>
                  <input className="input text-sm" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>

              {form.channel === "EMAIL" && (
                <div>
                  <label className="label">Subject line</label>
                  <input className="input text-sm" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Your appointment reminder from {business_name}" />
                </div>
              )}

              <div>
                <label className="label">Body</label>
                <textarea
                  className="input h-36 resize-y font-mono text-sm"
                  required value={form.body}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1">Available variables: {VARIABLE_HINTS}</p>
              </div>

              {editing && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Test send</p>
                  <div className="flex gap-2">
                    <input className="input text-sm flex-1" type={editing.channel === "EMAIL" ? "email" : "tel"} placeholder={editing.channel === "EMAIL" ? "your@email.com" : "+357 99..."} value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                    <button type="button" onClick={handleTestSend} disabled={testSending} className="btn-secondary text-sm">{testSending ? "Sending…" : "Send test"}</button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowNew(false); setEditing(null); }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create template"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
