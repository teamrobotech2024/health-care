/**
 * Client-side auth helpers for HealthConnect.
 * Handles token storage, retrieval, and session management.
 */

const TOKEN_KEY = "hc_access_token";
const REFRESH_TOKEN_KEY = "hc_refresh_token";
const USER_KEY = "hc_user";

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  role: "patient" | "admin";
};

/** Store session data after login */
export function saveSession(
  accessToken: string,
  refreshToken: string,
  user: StoredUser
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Clear all session data (logout) */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Get the stored access token */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Get the stored refresh token */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Get the stored user object */
export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

/** Check if user is logged in */
export function isLoggedIn(): boolean {
  return !!getToken() && !!getUser();
}

/** Get user role */
export function getRole(): "patient" | "admin" | null {
  return getUser()?.role ?? null;
}

/** Check if current user is an admin */
export function isAdmin(): boolean {
  return getRole() === "admin";
}

/** Get first letter of the user's name (for avatar) */
export function getAvatarLetter(): string {
  const user = getUser();
  if (!user?.name) return "U";
  return user.name.charAt(0).toUpperCase();
}
