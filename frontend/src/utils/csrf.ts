const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

export async function initializeCsrfToken(): Promise<void> {
  if (getCsrfTokenFromCookie()) {
    return;
  }

  let lastStatus: number | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        return;
      }

      lastStatus = response.status;
      if (attempt === 1) {
        throw new Error(`CSRF initialization failed with status ${lastStatus}`);
      }
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        if (lastStatus !== null) {
          throw new Error(`CSRF initialization failed with status ${lastStatus}`);
        }
        throw new Error('CSRF initialization failed due to network error');
      }
    }
  }

  throw new Error(`CSRF initialization failed: ${String(lastError || 'unknown error')}`);
}

export function getCsrfTokenFromCookie(): string {
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('csrfToken='));

  if (!cookie) {
    return '';
  }

  return decodeURIComponent(cookie.split('=').slice(1).join('='));
}
