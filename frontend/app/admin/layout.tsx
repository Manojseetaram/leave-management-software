"use client";

import React from "react";
import { RoleGuard } from "@/src/components/shared/RoleGuard";
import { RoleLayout } from "@/src/components/shared/RoleLayout";
import { LayoutDashboard, Users, FileText, FileCheck, Bell, BarChart3, UserCog } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { href: "/admin/students", label: "Students", icon: <Users size={18} /> },
  { href: "/admin/staff", label: "Staff accounts", icon: <UserCog size={18} /> },
  { href: "/admin/leave-requests", label: "Leave queue", icon: <FileText size={18} /> },
  { href: "/admin/documents", label: "Documents", icon: <FileCheck size={18} /> },
  { href: "/admin/reports", label: "Reports", icon: <BarChart3 size={18} /> },
  { href: "/admin/notifications", label: "Notifications", icon: <Bell size={18} /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow={["admin"]}>
      <RoleLayout role="admin" title="Admin" navItems={navItems}>
        {children}
      </RoleLayout>
    </RoleGuard>
  );
}
