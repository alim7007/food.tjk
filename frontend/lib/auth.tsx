"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { loginUser, registerUser, refreshToken, logoutUser } from "@/lib/api";
import type { AuthUser, UserRole, RegisterRequest } from "@/lib/types";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const REFRESH_KEY = "nexara_refresh_token";
const USER_KEY = "nexara_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(USER_KEY);
    const rt = localStorage.getItem(REFRESH_KEY);

    if (saved && rt) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem(USER_KEY);
      }

      refreshToken(rt)
        .then((res) => {
          localStorage.setItem(REFRESH_KEY, res.refresh_token);
        })
        .catch(() => {
          localStorage.removeItem(REFRESH_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginUser({ email, password });
    const u: AuthUser = {
      user_id: res.user_id,
      email: res.email,
      name: res.name,
      role: res.role,
    };
    localStorage.setItem(REFRESH_KEY, res.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const res = await registerUser(data);
    const u: AuthUser = {
      user_id: res.user_id,
      email: res.email,
      name: res.name,
      role: res.role,
    };
    localStorage.setItem(REFRESH_KEY, res.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    const rt = localStorage.getItem(REFRESH_KEY);
    if (rt) {
      try {
        await logoutUser(rt);
      } catch {
        // token may already be invalid
      }
    }
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
