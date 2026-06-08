"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

interface Props {
  user: { id?: string; name?: string | null; email?: string | null };
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/groups", label: "Groups", icon: "◉" },
];

export default function Sidebar({ user }: Props) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active ? "bg-teal-50 text-teal-700 shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold text-sm">S</div>
          <span className="font-bold text-gray-900">SplitEase</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
          <span className="text-xl">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/30" onClick={() => setOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <div className={`md:hidden fixed top-14 left-0 bottom-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <nav className="px-3 py-4 space-y-1">
          <NavLinks />
        </nav>
        <div className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-sm">
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs text-gray-400 hover:text-red-500 transition">Sign out</button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col h-full shrink-0">
        <div className="px-5 py-5 border-b border-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">S</div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">SplitEase</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLinks />
        </nav>

        <div className="px-4 py-4 border-t border-gray-50">
          <div className="flex items-center gap-3 mb-3 p-2 rounded-xl hover:bg-gray-50 transition">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-sm shrink-0">
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full text-left text-xs text-gray-400 hover:text-red-500 transition px-2 py-1">
            Sign out →
          </button>
        </div>
      </aside>
    </>
  );
}
