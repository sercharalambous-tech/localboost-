"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

interface Stats {
  totalAppointments: number;
  confirmedRate: number;
  noShowRate: number;
  completedCount: number;
  reviewRequestsSent: number;
  avgRating: number | null;
  feedbackCount: number;
  messagesUsed: number;
  messageLimit: number;
}

function StatCard({ icon, label, value, sublabel, colorClass = "text-gray-900" }: {
  icon: string; label: string; value: string | number; sublabel?: string; colorClass?: string;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-3xl font-extrabold ${colorClass} mb-1`}>{value}</div>
      <div className="text-sm font-medium text-gray-600">{label}</div>
      {sublabel && <div className="text-xs text-gray-400 mt-1">{sublabel}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(({ business }) => {
      if (business) {
        setBusinessId(business.id);
        fetch(`/api/dashboard?businessId=${business.id}`)
          .then(r => r.json())
          .then(({ stats, upcomingAppointments }) => {
            setStats(stats);
            setUpcoming(upcomingAppointments);
            setLoading(false);
          });
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3 animate-spin">⏳</div>
          <p>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-xl mx-auto text-center py-24">
        <div className="text-5xl mb-4">🏗️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Finish setting up your business</h2>
        <p className="text-gray-500 mb-6">Complete onboarding to start sending automated reminders.</p>
        <Link href="/onboarding" className="btn-primary">Complete setup →</Link>
      </div>
    );
  }

  const usagePercent = stats.messageLimit > 0 ? Math.round((stats.messagesUsed / stats.messageLimit) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview for this month</p>
      </div>

      {/* KPI grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📅" label="Appointments this month" value={stats.totalAppointments} />
        <StatCard icon="✅" label="Confirmation rate" value={`${stats.confirmedRate}%`}
          sublabel="appointments confirmed" colorClass="text-green-600" />
        <StatCard icon="❌" label="No-show rate" value={`${stats.noShowRate}%`}
          colorClass={stats.noShowRate > 20 ? "text-red-600" : "text-orange-500"} />
        <StatCard icon="⭐" label="Avg. feedback rating"
          value={stats.avgRating ? `${stats.avgRating}/5` : "—"}
          sublabel={`${stats.feedbackCount} responses`} colorClass="text-yellow-600" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon="🌟" label="Review requests sent" value={stats.reviewRequestsSent} />
        <StatCard icon="✔️" label="Completed appointments" value={stats.completedCount} />
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📨</span>
            <Link href="/billing" className="text-xs text-brand-600 hover:underline">Upgrade</Link>
          </div>
          <div className="text-3xl font-extrabold text-gray-900 mb-1">
            {stats.messagesUsed} / {stats.messageLimit}
          </div>
          <div className="text-sm font-medium text-gray-600 mb-3">Messages used this month</div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${usagePercent > 80 ? "bg-red-500" : usagePercent > 60 ? "bg-yellow-400" : "bg-green-500"}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          {usagePercent >= 100 && (
            <p className="text-xs text-red-600 mt-2">⚠️ Limit reached — sending paused. <Link href="/billing" className="underline">Upgrade now</Link></p>
          )}
        </div>
      </div>

      {/* Upcoming appointments */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Upcoming Appointments</h2>
          <Link href="/appointments" className="text-sm text-brand-600 hover:underline">View all →</Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400">
            <div className="text-3xl mb-3">📅</div>
            <p className="text-sm">No upcoming appointments.</p>
            <Link href="/appointments" className="btn-primary text-sm mt-4 inline-block">Add appointment →</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcoming.map((apt: any) => (
              <div key={apt.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{apt.customer.fullName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{apt.serviceName} · {formatDateTime(apt.startAt)}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  apt.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                  apt.status === "SCHEDULED" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {apt.status.charAt(0) + apt.status.slice(1).toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: "➕", label: "New Appointment", href: "/appointments?new=1", color: "brand" },
          { icon: "👤", label: "Add Customer", href: "/customers?new=1", color: "green" },
          { icon: "⚡", label: "Review Automations", href: "/automations", color: "purple" },
        ].map(({ icon, label, href }) => (
          <Link key={href} href={href} className="card p-5 hover:shadow-md transition-shadow flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <span className="font-medium text-gray-700 text-sm">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
