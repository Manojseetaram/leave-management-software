"use client";

import { authApi } from "@/src/lib/api/authApi";
import { useAuthToken } from "@/src/hooks/useToken";
import { setToken } from "@/src/lib/tokenStore";
import type { AuthMeResponse, UserProfile } from "@/src/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  roles: string[];
  studentId: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (login: string, password: string) => Promise<AuthMeResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthToken();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const clear = useCallback(() => {
    setUser(null);
    setRoles([]);
    setStudentId(null);
  }, []);

  useEffect(() => {
    let active = true;
    if (!token) {
      clear();
      setLoading(false);
      return;
    }
    setLoading(true);
    authApi
      .me()
      .then((me) => {
        if (!active) return;
        setUser(me.user);
        setRoles(me.roles);
        setStudentId(me.student_id);
      })
      .catch(() => {
        if (!active) return;
        clear();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, clear]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => clear();
    window.addEventListener("leave:signout", handler);
    window.addEventListener("leave:password-change-required", handler);
    return () => {
      window.removeEventListener("leave:signout", handler);
      window.removeEventListener("leave:password-change-required", handler);
    };
  }, [clear]);

  const login = useCallback(
    async (loginValue: string, password: string) => {
      const res = await authApi.login(loginValue, password);
      setToken(res.token);
      const me = await authApi.me();
      setUser(me.user);
      setRoles(me.roles);
      setStudentId(me.student_id);
      setLoading(false);
      return me;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    setToken(null);
    clear();
    if (typeof window !== "undefined") {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("leave.")) keys.push(k);
      }
      keys.forEach((k) => window.localStorage.removeItem(k));
      const loginUrl = window.location.origin + "/login";
      window.location.href = loginUrl;
    }
  }, [clear]);

  const refresh = useCallback(async () => {
    if (!token) {
      clear();
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const me = await authApi.me();
      setUser(me.user);
      setRoles(me.roles);
      setStudentId(me.student_id);
    } catch {
      clear();
    } finally {
      setLoading(false);
    }
  }, [token, clear]);

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, roles, studentId, loading, login, logout, refresh }),
    [token, user, roles, studentId, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
