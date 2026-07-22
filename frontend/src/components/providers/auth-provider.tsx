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

type SessionSnapshot = {
  token: string | null;
  user: UserInfo | null;
  organization: Organization | null;
  isRefreshing: boolean;
};

const emptySession: SessionSnapshot = {
  token: null,
  user: null,
  organization: null,
  isRefreshing: false,
};

let isRefreshing = false;
const sessionListeners = new Set<() => void>();

function readSession(): SessionSnapshot {
  return {
    token: authStorage.getToken(),
    user: authStorage.getUser(),
    organization: authStorage.getOrganization(),
    isRefreshing,
  };
}

function emitSessionChange() {
  sessionListeners.forEach((listener) => listener());
}

function setRefreshing(value: boolean) {
  if (isRefreshing === value) return;
  isRefreshing = value;
  emitSessionChange();
}

function subscribeSession(listener: () => void) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function getServerSessionSnapshot(): SessionSnapshot {
  return emptySession;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    subscribeSession,
    readSession,
    getServerSessionSnapshot,
  );

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) {
      return;
    }

    let cancelled = false;

    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setRefreshing(true);
      try {
        const freshUser = await authApi.me(token);
        if (cancelled) return;
        authStorage.setSession(token, freshUser);
        emitSessionChange();
      } catch {
        if (cancelled) return;
        authStorage.clearSession();
        emitSessionChange();
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session.token]);

  const login = useCallback(async (payload: LoginRequest) => {
    const result = await authApi.login(payload);
    authStorage.setSession(result.token, result.user);
    emitSessionChange();
  }, []);

  const register = useCallback(async (payload: RegisterRequest) => {
    await authApi.register(payload);
    const result = await authApi.login({
      email: payload.email,
      password: payload.password,
    });
    authStorage.setSession(result.token, result.user);
    emitSessionChange();
  }, []);

  const logout = useCallback(() => {
    authStorage.clearSession();
    authStorage.setOrganization(null);
    emitSessionChange();
  }, []);

  const setOrganization = useCallback((org: Organization | null) => {
    authStorage.setOrganization(org);
    emitSessionChange();
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = authStorage.getToken();
    if (!currentToken) {
      throw new Error("Not authenticated");
    }
    const freshUser = await authApi.me(currentToken);
    authStorage.setSession(currentToken, freshUser);
    emitSessionChange();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session.user,
      token: session.token,
      organization: session.organization,
      isLoading: session.isRefreshing,
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
