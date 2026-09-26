const TOKEN_KEY = "autism_admin_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Decodes the JWT payload without verifying it -- only used for optimistic
 * UI (e.g. "is this token structurally expired"). The server is always the
 * real authority on validity; every request still gets 401'd there if not.
 */
export function decodeTokenPayload(token: string): { sub: string; role: string; exp: number } | null {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeTokenPayload(token);
  if (!payload) return true;
  return payload.exp * 1000 < Date.now();
}
