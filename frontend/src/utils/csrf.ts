const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

export async function initializeCsrfToken(): Promise<void> {
  if (getCsrfTokenFromCookie()) {
    return;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
        method: 'GET',
        credentials: 'include'
      });
    } catch {
      if (attempt === 1) {
        throw new Error('CSRF initialization failed due to network error');
      }

      continue;
    }

    if (response.ok) {
      return;
    }

    if (attempt === 1) {
      throw new Error(`CSRF initialization failed with status ${response.status}`);
    }
  }
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
