import type { Organization, UserInfo } from "@/lib/api/types";

const TOKEN_KEY = "adcs.auth.token";
const USER_KEY = "adcs.auth.user";
const ORG_KEY = "adcs.session.organization";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export const authStorage = {
  getToken(): string | null {
    if (!canUseStorage()) return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },

  setSession(token: string, user: UserInfo): void {
    if (!canUseStorage()) return;
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getUser(): UserInfo | null {
    if (!canUseStorage()) return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as UserInfo;
    } catch {
      return null;
    }
  },

  clearSession(): void {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },

  getOrganization(): Organization | null {
    if (!canUseStorage()) return null;
    const raw = window.localStorage.getItem(ORG_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as Organization;
    } catch {
      return null;
    }
  },

  setOrganization(org: Organization | null): void {
    if (!canUseStorage()) return;
    if (!org) {
      window.localStorage.removeItem(ORG_KEY);
      return;
    }
    window.localStorage.setItem(ORG_KEY, JSON.stringify(org));
  },

  /** Align tenant header with the org id from the current route (before data fetches). */
  ensureOrganizationId(orgId: string): void {
    if (!canUseStorage()) return;
    const current = this.getOrganization();
    if (current?.id === orgId) return;

    this.setOrganization({
      id: orgId,
      name: "",
      slug: "",
      status: "active",
      created_at: "",
    });
  },
};
