const ADMIN_TOKEN_STORAGE_KEY = 'whs_admin_bearer_token';

export function getAdminSessionToken(): string {
  try {
    return window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminSessionToken(token: string): void {
  try {
    if (token) {
      window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    }
  } catch {
    // Ignore storage restriction errors; HttpOnly cookie remains active fallback
  }
}

export function clearAdminSessionToken(): void {
  try {
    window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function getAdminAuthHeaders(): Record<string, string> {
  const token = getAdminSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
