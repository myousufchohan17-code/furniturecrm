import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { Settings, User } from "../api/types";

type AuthContextValue = {
  user: User | null;
  settings: Settings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshSettings() {
    const data = await api<Settings>("/api/settings");
    setSettings(data);
  }

  async function refreshUser() {
    const data = await api<User>("/api/auth/me");
    setUser(data);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [nextUser, nextSettings] = await Promise.all([
          api<User>("/api/auth/me"),
          api<Settings>("/api/settings"),
        ]);
        if (!active) return;
        setUser(nextUser);
        setSettings(nextSettings);
      } catch {
        if (active) {
          setUser(null);
          setSettings(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      settings,
      loading,
      refreshSettings,
      refreshUser,
    }),
    [user, settings, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
