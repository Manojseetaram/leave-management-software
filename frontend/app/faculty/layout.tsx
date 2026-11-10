"use client";

import React from "react";
import { RoleGuard } from "@/src/components/shared/RoleGuard";
import { RoleLayout } from "@/src/components/shared/RoleLayout";
import { LayoutDashboard, Users, FileText } from "lucide-react";

const navItems = [
  { href: "/faculty", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { href: "/faculty/students", label: "Students", icon: <Users size={18} /> },
  { href: "/faculty/leave-requests", label: "Leave requests", icon: <FileText size={18} /> },
];

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow={["faculty"]}>
      <RoleLayout role="faculty" title="Faculty" navItems={navItems}>
        {children}
      </RoleLayout>
    </RoleGuard>
  );
}
