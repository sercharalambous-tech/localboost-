"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase";

interface NavItem {
  href:     string;
  label:    string;
  section:  string;
}

const NAV: NavItem[] = [
  // ââ Core ââ
  { href: "/dashboard",            label: "Dashboard",      section: "core" },
  { href: "/appointments",          label: "Appointments",   section: "core" },
  { href: "/customers",             label: "Customers",      section: "core" },

  // ââ Booking (marketplace) ââ
  { href: "/services",              label: "Services",       section: "booking" },
  { href: "/settings/profile",      label: "Public Profile", section: "booking" },
  { href: "/settings/availability", label: "Availability",   section: "booking" },
  { href: "/settings/reviews",      label: "Reviews",        section: "booking" },

  // ââ Automation ââ
  { href: "/automations",           label: "Automations",    section: "automation" },
  { href: "/templates",             label: "Templates",      section: "automation" },

  // ââ Account ââ
  { href: "/billing",               label: "Billing",        section: "account" },
  { href: "/settings",              label: "Settings",       section: "account" },
];

const SECTIONS = [
  { key: "core",       label: null },
  { key: "booking",    label: "Online Booking" },
  { key: "automation", label: "Automation" },
  { key: "account",    label: "Account" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/settings") return pathname === "/settings";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const SidebarContent = () => (
    <>
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <Link href="/dashboard" className="font-semibold text-sm text-gray-900 tracking-tight">
          LocalBoost
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {SECTIONS.map(({ key, label }) => {
          const items = NAV.filter((n) => n.section === key);
          return (
            <div key={key}>
              {label && (
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">{label}</p>
              )}
              {items.map(({ href, label: itemLabel }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive(href)
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {itemLabel}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="px-3 pb-5 pt-3 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-full bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-52 h-screen fixed left-0 top-0 bg-white border-r border-gray-100 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile overlay + sidebar */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-52 bg-white border-r border-gray-100 z-50 flex flex-col lg:hidden">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col lg:pl-52 min-h-screen">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-30">
          <button onClick={() => setOpen(true)} className="text-gray-500 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-sm text-gray-900">LocalBoost</span>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
