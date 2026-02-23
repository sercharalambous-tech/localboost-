"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, trialing: 0, pastDue: 0 });

  useEffect(() => {
    fetch("/api/admin/businesses").then(r => r.json()).then(({ businesses, stats }) => {
      setBusinesses(businesses ?? []);
      if (stats) setStats(stats);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🛡️ Operator Admin</h1>
          <p className="text-gray-500 text-sm mt-1">All businesses in LocalBoost</p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-sm">← My Dashboard</Link>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "Total businesses", value: stats.total, color: "text-gray-900" },
          { label: "Active subscriptions", value: stats.active, color: "text-green-600" },
          { label: "Trialing", value: stats.trialing, color: "text-blue-600" },
          { label: "Past due", value: stats.pastDue, color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-5">
            <div className={`text-3xl font-extrabold ${color}`}>{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Business list */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Businesses</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Business", "Owner", "Plan", "Status", "Messages used", "Customers", "Appointments", "Created"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              ) : businesses.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                  <td className="px-4 py-3 text-gray-600">{b.owner?.name}<br/><span className="text-xs text-gray-400">{b.owner?.email}</span></td>
                  <td className="px-4 py-3">
                    <span className="badge-blue">{b.billing?.plan ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={b.billing?.status === "ACTIVE" ? "badge-green" : b.billing?.status === "TRIALING" ? "badge-blue" : b.billing?.status === "PAST_DUE" ? "badge-red" : "badge-gray"}>
                      {b.billing?.status ?? "None"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {b.billing?.messagesUsedThisMonth ?? 0}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b._count?.customers ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600">{b._count?.appointments ?? 0}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(b.createdAt).toLocaleDateString("en-CY")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
