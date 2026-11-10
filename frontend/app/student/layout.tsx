"use client";

import React from "react";
import { RoleGuard } from "@/src/components/shared/RoleGuard";
import { RoleLayout } from "@/src/components/shared/RoleLayout";
import { LayoutDashboard, FileText, User, Calendar } from "lucide-react";

const navItems = [
  { href: "/student", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { href: "/student/requests", label: "My requests", icon: <FileText size={18} /> },
  { href: "/student/requests/new", label: "New request", icon: <Calendar size={18} /> },
  { href: "/student/profile", label: "Profile", icon: <User size={18} /> },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow={["student"]}>
      <RoleLayout role="student" title="Student" navItems={navItems}>
        {children}
      </RoleLayout>
    </RoleGuard>
  );
}
