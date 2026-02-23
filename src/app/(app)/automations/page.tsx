"use client";
import { useEffect, useState } from "react";

const RULE_INFO: Record<string, { icon: string; label: string; description: string }> = {
  REMINDER_24H: { icon: "📩", label: "24-hour Reminder", description: "Sent 24 hours before the appointment. Includes Confirm and Cancel links." },
  REMINDER_2H: { icon: "📱", label: "2-hour Reminder", description: "Sent 2 hours before the appointment. A final nudge." },
  FEEDBACK_1H: { icon: "⭐", label: "Feedback Request", description: "Sent 1 hour after appointment is marked Completed. Asks for a 1–5 rating." },
  REVIEW_FOLLOWUP_48H: { icon: "🌟", label: "Google Review Request", description: "Sent after a customer gives 4–5 star feedback. Includes your Google Review link." },
};

const CHANNEL_LABELS: Record<string, string> = {
  SMS: "SMS only",
  EMAIL: "Email only",
  BOTH: "SMS + Email",
};

export default function AutomationsPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(async ({ business }) => {
      if (!business) return;
      setBusinessId(business.id);
      const [rulesData, tmplData] = await Promise.all([
        fetch(`/api/automations?businessId=${business.id}`).then(r => r.json()),
        fetch(`/api/templates?businessId=${business.id}`).then(r => r.json()),
      ]);
      setRules(rulesData.rules ?? []);
      setTemplates(tmplData.templates ?? []);
      setLoading(false);
    });
  }, []);

  async function toggleRule(id: string, enabled: boolean) {
    setSaving(id);
    await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
    setSaving(null);
  }

  async function updateChannel(id: string, channel: string) {
    setSaving(id);
    await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    setRules(prev => prev.map(r => r.id === id ? { ...r, channel } : r));
    setSaving(null);
  }

  async function updateTemplate(id: string, templateId: string | null) {
    setSaving(id);
    await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    setRules(prev => prev.map(r => r.id === id ? { ...r, templateId } : r));
    setSaving(null);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
        <p className="text-gray-500 text-sm mt-1">Configure which messages are sent automatically and when.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule: any) => {
            const info = RULE_INFO[rule.type] ?? {};
            return (
              <div key={rule.id} className={`card p-6 transition-opacity ${saving === rule.id ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <span className="text-3xl mt-0.5">{info.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{info.label}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {rule.enabled ? "Active" : "Paused"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{info.description}</p>

                      <div className="grid sm:grid-cols-2 gap-3 mt-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">Channel</label>
                          <select
                            className="input text-sm"
                            value={rule.channel}
                            disabled={saving === rule.id}
                            onChange={e => updateChannel(rule.id, e.target.value)}
                          >
                            {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">Template override</label>
                          <select
                            className="input text-sm"
                            value={rule.templateId ?? ""}
                            disabled={saving === rule.id}
                            onChange={e => updateTemplate(rule.id, e.target.value || null)}
                          >
                            <option value="">Default template</option>
                            {templates.map((t: any) => (
                              <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleRule(rule.id, !rule.enabled)}
                    disabled={saving === rule.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${rule.enabled ? "bg-brand-600" : "bg-gray-200"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${rule.enabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card p-6 bg-blue-50 border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-2">📋 How automations work</h3>
        <ul className="text-sm text-blue-800 space-y-1.5">
          <li>• Reminders are scheduled automatically when you create an appointment.</li>
          <li>• If an appointment is cancelled or rescheduled, reminders are updated automatically.</li>
          <li>• Feedback requests are triggered only when you mark an appointment as <strong>Completed</strong>.</li>
          <li>• Messages respect customer opt-out preferences at all times.</li>
          <li>• Sending pauses automatically if your monthly message limit is reached.</li>
        </ul>
      </div>
    </div>
  );
}
