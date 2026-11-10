"use client";

import React from "react";
import { RoleGuard } from "@/src/components/shared/RoleGuard";
import { RoleLayout } from "@/src/components/shared/RoleLayout";
import { LayoutDashboard, Users, FileText, FileCheck, Bell, ScrollText, BarChart3 } from "lucide-react";

const navItems = [
  { href: "/hod", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { href: "/hod/leave-requests", label: "Leave queue", icon: <FileText size={18} /> },
  { href: "/hod/students", label: "Students", icon: <Users size={18} /> },
  { href: "/hod/documents", label: "Documents", icon: <FileCheck size={18} /> },
  { href: "/hod/reports", label: "Reports", icon: <BarChart3 size={18} /> },
  { href: "/hod/notifications", label: "Notifications", icon: <Bell size={18} /> },
  { href: "/hod/audit", label: "Audit log", icon: <ScrollText size={18} /> },
];

export default function HodLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow={["hod"]}>
      <RoleLayout role="hod" title="HOD" navItems={navItems}>
        {children}
      </RoleLayout>
    </RoleGuard>
  );
}
