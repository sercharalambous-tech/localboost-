"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase";

const nav = [
  { href: "/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/appointments", icon: "📅", label: "Appointments" },
  { href: "/customers", icon: "👥", label: "Customers" },
  { href: "/automations", icon: "⚡", label: "Automations" },
  { href: "/templates", icon: "📝", label: "Templates" },
  { href: "/billing", icon: "💳", label: "Billing" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const Sidebar = () => (
    <aside className={`flex flex-col bg-gray-900 text-white w-60 h-full fixed left-0 top-0 z-40 transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-700">
        <span className="text-2xl">🚀</span>
        <span className="font-bold text-lg">LocalBoost</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-lg">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-gray-700 pt-4">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white w-full transition-colors"
        >
          <span className="text-lg">🚪</span> Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-full bg-gray-50">
      <Sidebar />
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col lg:pl-60 min-h-screen">
        {/* Mobile top bar */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 text-2xl">☰</button>
          <span className="font-bold text-brand-700">🚀 LocalBoost</span>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
