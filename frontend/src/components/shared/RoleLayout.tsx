"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useTheme } from "@/src/hooks/useTheme";
import { cn } from "@/src/utils/format";

export interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

const roleAccent: Record<string, string> = {
  student: "bg-indigo-500",
  faculty: "bg-teal-500",
  hod: "bg-orange-500",
  admin: "bg-violet-700",
};

const roleGradient: Record<string, string> = {
  student: "from-indigo-600 to-violet-600",
  faculty: "from-teal-600 to-cyan-600",
  hod: "from-orange-500 to-rose-500",
  admin: "from-violet-700 to-indigo-800",
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
  const { toggle, theme } = useTheme();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sidebar = (
    <aside
      className={cn(
        "flex h-full w-64 flex-col bg-gradient-to-b text-white",
        roleGradient[role] ?? "from-indigo-600 to-violet-600",
      )}
    >
      <div className="px-6 py-6">
        <p className="text-xs uppercase tracking-wide opacity-80">ISE Department</p>
        <h1 className="mt-1 text-xl font-semibold">{title}</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
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
        <p className="text-sm font-medium">{user?.full_name}</p>
        <p className="text-xs opacity-80">{user?.email}</p>
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
      <div className="hidden md:flex">{sidebar}</div>
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-50">{sidebar}</div>
          <button
            className="absolute right-4 top-4 z-50 text-white"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>
      )}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu />
            </button>
            <div className={cn("h-2 w-2 rounded-full", roleAccent[role])} />
            <span className="text-sm font-medium text-foreground">{title} portal</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
