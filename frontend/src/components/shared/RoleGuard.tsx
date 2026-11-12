"use client";

import React from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Loading } from "@/src/components/ui/Loading";

export function RoleGuard({
  allow,
  children,
}: {
  allow: string[];
  children: React.ReactNode;
}) {
  const { user, roles, loading, token } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!user) return;
    if (user.must_change_password) {
      router.replace("/change-password");
      return;
    }
    const ok = roles.some((r) => allow.includes(r));
    if (!ok) {
      // redirect to own portal
      const primary = roles[0];
      if (primary === "student") router.replace("/student");
      else if (primary === "faculty") router.replace("/faculty");
      else if (primary === "hod") router.replace("/hod");
      else if (primary === "admin") router.replace("/admin");
      else router.replace("/login");
    }
  }, [loading, user, roles, allow, router, token]);

  if (loading) return <Loading />;
  if (!token) {
    router.replace("/login");
    return null;
  }
  if (!user) return <Loading />;
  if (user.must_change_password) return null;
  if (!roles.some((r) => allow.includes(r))) return null;
  return <>{children}</>;
}

export default RoleGuard;
