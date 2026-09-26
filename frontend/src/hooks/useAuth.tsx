import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { login as apiLogin, me as apiMe } from "../api/auth";
import { ApiError } from "../lib/api";
import { clearToken, getToken, isTokenExpired, setToken } from "../lib/auth-storage";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      clearToken();
      setUser(null);
      setStatus("unauthenticated");
      return;
    }
    try {
      const current = await apiMe();
      if (current.role !== "admin") {
        // This console is admin-only: never keep a non-admin session around.
        clearToken();
        setUser(null);
        setStatus("unauthenticated");
        return current;
      }
      setUser(current);
      setStatus("authenticated");
      return current;
    } catch {
      clearToken();
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const token = await apiLogin(email, password);
      setToken(token.access_token);
      const current = await loadUser();
      if (current && current.role !== "admin") {
        throw new ApiError(403, "This console is for admin accounts only. Parents and therapists use the mobile app.");
      }
    },
    [loadUser],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return <AuthContext.Provider value={{ user, status, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
