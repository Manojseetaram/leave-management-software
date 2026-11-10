"use client";

import { useAuth } from "@/src/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loading } from "@/src/components/ui/Loading";

export default function Home() {
  const { user, roles, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.must_change_password) {
      router.replace("/change-password");
      return;
    }
    const primary = roles[0];
    if (primary === "student") router.replace("/student");
    else if (primary === "faculty") router.replace("/faculty");
    else if (primary === "hod") router.replace("/hod");
    else if (primary === "admin") router.replace("/admin");
    else router.replace("/login");
  }, [loading, user, roles, router]);

  return <Loading />;
}