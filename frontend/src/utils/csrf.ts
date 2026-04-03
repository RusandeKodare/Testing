const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

export async function initializeCsrfToken(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`CSRF initialization failed with status ${response.status}`);
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
