"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { authApi } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/errors";
import type { LoginRequest, Organization, RegisterRequest, UserInfo } from "@/lib/api/types";
import { authStorage } from "@/lib/auth/storage";
import {
  getServerSessionSnapshot,
  getSessionSnapshot,
  publishSessionFromStorage,
  setSessionRefreshing,
  subscribeSession,
} from "@/lib/auth/session-store";

type AuthContextValue = {
  user: UserInfo | null;
  token: string | null;
  organization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
  setOrganization: (org: Organization | null) => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function subscribeNoop() {
  return () => {};
}

function getClientMounted() {
  return true;
}

function getServerMounted() {
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // SSR snapshot is empty; stay in loading until the client store is active.
  // Primitive true/false snapshots stay Object.is-stable (no effect setState).
  const hasHydrated = useSyncExternalStore(
    subscribeNoop,
    getClientMounted,
    getServerMounted,
  );
  const session = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );

  useEffect(() => {
    if (!hasHydrated) return;

    const token = authStorage.getToken();
    if (!token) {
      return;
    }

    let cancelled = false;

    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setSessionRefreshing(true);
      try {
        const freshUser = await authApi.me(token);
        if (cancelled) return;
        authStorage.setSession(token, freshUser);
        publishSessionFromStorage();
      } catch {
        if (cancelled) return;
        authStorage.clearSession();
        publishSessionFromStorage();
      } finally {
        if (!cancelled) setSessionRefreshing(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, session.token]);

  const login = useCallback(async (payload: LoginRequest) => {
    const result = await authApi.login(payload);
    authStorage.setSession(result.token, result.user);
    publishSessionFromStorage();
  }, []);

  const register = useCallback(async (payload: RegisterRequest) => {
    await authApi.register(payload);
    const result = await authApi.login({
      email: payload.email,
      password: payload.password,
    });
    authStorage.setSession(result.token, result.user);
    publishSessionFromStorage();
  }, []);

  const logout = useCallback(() => {
    authStorage.clearSession();
    authStorage.setOrganization(null);
    publishSessionFromStorage();
  }, []);

  const setOrganization = useCallback((org: Organization | null) => {
    authStorage.setOrganization(org);
    publishSessionFromStorage();
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = authStorage.getToken();
    if (!currentToken) {
      throw new Error("Not authenticated");
    }
    const freshUser = await authApi.me(currentToken);
    authStorage.setSession(currentToken, freshUser);
    publishSessionFromStorage();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session.user,
      token: session.token,
      organization: session.organization,
      isLoading: !hasHydrated || session.isRefreshing,
      isAuthenticated: Boolean(session.token && session.user),
      login,
      register,
      logout,
      setOrganization,
      refreshUser,
    }),
    [
      session.user,
      session.token,
      session.organization,
      session.isRefreshing,
      hasHydrated,
      login,
      register,
      logout,
      setOrganization,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function useAuthErrorMessage(error: unknown) {
  return getErrorMessage(error);
}
