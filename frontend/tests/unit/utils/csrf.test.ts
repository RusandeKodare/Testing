import { getCsrfTokenFromCookie, initializeCsrfToken } from '../../../src/utils/csrf';

global.fetch = jest.fn();

describe('csrf utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = 'csrfToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('returns csrf token from cookie when present', () => {
    document.cookie = 'csrfToken=test-token-value';

    const token = getCsrfTokenFromCookie();

    expect(token).toBe('test-token-value');
  });

  it('returns empty string when csrf cookie is missing', () => {
    const token = getCsrfTokenFromCookie();

    expect(token).toBe('');
  });

  it('skips network call when token cookie already exists', async () => {
    document.cookie = 'csrfToken=already-set';

    await initializeCsrfToken();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('initializes csrf token on first successful request', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    await initializeCsrfToken();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/auth/csrf', {
      method: 'GET',
      credentials: 'include'
    });
  });

  it('retries once and throws when csrf endpoint keeps failing', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 429 });

    await expect(initializeCsrfToken()).rejects.toThrow('CSRF initialization failed with status 429');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
