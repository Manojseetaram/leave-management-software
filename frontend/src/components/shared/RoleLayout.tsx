"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/src/contexts/AuthContext";
import { cn } from "@/src/utils/format";

export interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

const roleAccent: Record<string, string> = {
  student: "bg-[#1E90FF]",
  faculty: "bg-black",
  hod: "bg-[#1E90FF]",
  admin: "bg-black",
};


export function RoleLayout({
  role,
  title,
  navItems,
  children,
}: {
  role: string;
  title: string;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Only the most specific matching link is active
  const activeHref =
    navItems
      .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  const sidebar = (
    <aside className="flex h-full w-64 flex-col bg-[#1E90FF] text-white">
      <div className="px-6 py-6">
        <p className="text-xs uppercase tracking-wide opacity-80">ISE Department</p>
        <h1 className="mt-1 text-xl font-semibold">{title}</h1>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {navItems.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/20 px-4 py-4">
        <p className="truncate text-sm font-medium">{user?.full_name}</p>
        <p className="truncate text-xs opacity-80">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-3 w-full rounded-lg bg-white/15 px-3 py-2 text-sm hover:bg-white/25"
        >
          Log out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <div className="sticky top-0 hidden h-screen shrink-0 md:block">{sidebar}</div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="relative z-10 h-full">{sidebar}</div>
          <button
            className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 text-white"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:grid md:grid-cols-[1fr_auto] md:px-6">
          {/* Left */}
          <div className="flex min-w-0 items-center gap-3 md:justify-self-start">
            <button
              className="md:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu />
            </button>
            <div className={cn("h-2 w-2 shrink-0 rounded-full", roleAccent[role])} />
            <span className="truncate text-sm font-medium text-foreground">{title} portal</span>
          </div>

          {/* Right: profile + theme toggle side by side */}
          <div className="flex items-center gap-3 md:justify-self-end">
            <div className="hidden min-w-0 items-center gap-3 sm:flex">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                {user?.full_name?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">
                  {user?.full_name}
                </span>
                <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1">{children}</main>
      </div>
    </div>
  );
}