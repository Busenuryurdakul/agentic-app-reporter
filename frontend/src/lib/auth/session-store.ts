import type { Organization, UserInfo } from "@/lib/api/types";
import { authStorage } from "@/lib/auth/storage";

export type SessionSnapshot = {
  token: string | null;
  user: UserInfo | null;
  organization: Organization | null;
  isRefreshing: boolean;
};

export const emptySession: SessionSnapshot = {
  token: null,
  user: null,
  organization: null,
  isRefreshing: false,
};

let snapshot: SessionSnapshot = emptySession;
let isRefreshing = false;
let hasClientHydrated = false;
const listeners = new Set<() => void>();

function usersEqual(a: UserInfo | null, b: UserInfo | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.email === b.email &&
    a.first_name === b.first_name &&
    a.last_name === b.last_name &&
    a.status === b.status &&
    a.created_at === b.created_at
  );
}

function organizationsEqual(
  a: Organization | null,
  b: Organization | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.slug === b.slug &&
    a.status === b.status &&
    a.created_at === b.created_at
  );
}

export function sessionsEqual(a: SessionSnapshot, b: SessionSnapshot): boolean {
  return (
    a.token === b.token &&
    a.isRefreshing === b.isRefreshing &&
    usersEqual(a.user, b.user) &&
    organizationsEqual(a.organization, b.organization)
  );
}

function readFromStorage(): SessionSnapshot {
  return {
    token: authStorage.getToken(),
    user: authStorage.getUser(),
    organization: authStorage.getOrganization(),
    isRefreshing,
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Publish a new snapshot only when values actually change.
 * Keeps Object.is(getSnapshot(), previous) stable across React tear checks.
 */
export function publishSession(next: SessionSnapshot): void {
  if (sessionsEqual(snapshot, next)) {
    return;
  }
  snapshot = next;
  notify();
}

/** Re-read localStorage and publish if changed (login/logout/org/401 clear). */
export function publishSessionFromStorage(): void {
  publishSession(readFromStorage());
}

export function setSessionRefreshing(value: boolean): void {
  if (isRefreshing === value) return;
  isRefreshing = value;
  publishSession({
    ...snapshot,
    isRefreshing: value,
  });
}

/**
 * Client getSnapshot for useSyncExternalStore.
 * Must return the same reference when data is unchanged — never allocate per call.
 */
export function getSessionSnapshot(): SessionSnapshot {
  if (typeof window !== "undefined" && !hasClientHydrated) {
    hasClientHydrated = true;
    const next = readFromStorage();
    // First client read: adopt storage without notifying (React is already reading).
    if (!sessionsEqual(snapshot, next)) {
      snapshot = next;
    }
  }
  return snapshot;
}

/** SSR / getServerSnapshot — always the same empty constant. */
export function getServerSessionSnapshot(): SessionSnapshot {
  return emptySession;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
