import {
  checkBackendHealth,
  reportBackendHealth,
  updateBackendStatusBanner
} from '../../../src/utils/backendHealth';

global.fetch = jest.fn();

describe('backendHealth', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('checkBackendHealth', () => {
    it('returns available when backend health endpoint is healthy', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      const result = await checkBackendHealth();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/health', {
        method: 'GET',
        credentials: 'include'
      });
      expect(result).toEqual({
        isAvailable: true,
        message: 'Backend is reachable'
      });
    });

    it('returns unavailable when endpoint responds with non-ok status code', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({})
      });

      const result = await checkBackendHealth();

      expect(result.isAvailable).toBe(false);
      expect(result.message).toContain('HTTP 503');
    });

    it('returns unavailable when fetch throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('connect ECONNREFUSED'));

      const result = await checkBackendHealth();

      expect(result.isAvailable).toBe(false);
      expect(result.message).toContain('Backend is unreachable');
    });

    it('returns unavailable when payload status is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'degraded' })
      });

      const result = await checkBackendHealth();

      expect(result.isAvailable).toBe(false);
      expect(result.message).toContain('unexpected payload');
    });
  });

  describe('updateBackendStatusBanner', () => {
    it('shows offline banner text when backend is unavailable', () => {
      document.body.innerHTML = '<div id="backend-status" class="backend-status-banner"></div>';

      updateBackendStatusBanner('backend-status', {
        isAvailable: false,
        message: 'Backend is unreachable'
      });

      const banner = document.getElementById('backend-status') as HTMLDivElement;
      expect(banner.className).toContain('show');
      expect(banner.textContent).toContain('Backend is currently unavailable');
    });

    it('hides banner when backend is available', () => {
      document.body.innerHTML = '<div id="backend-status" class="backend-status-banner show"></div>';

      updateBackendStatusBanner('backend-status', {
        isAvailable: true,
        message: 'Backend is reachable'
      });

      const banner = document.getElementById('backend-status') as HTMLDivElement;
      expect(banner.className).toBe('backend-status-banner');
      expect(banner.textContent).toBe('');
    });

    it('does nothing when target banner element does not exist', () => {
      document.body.innerHTML = '<div id="different-banner"></div>';

      expect(() => updateBackendStatusBanner('backend-status', {
        isAvailable: false,
        message: 'Backend is unreachable'
      })).not.toThrow();
    });
  });

  describe('reportBackendHealth', () => {
    it('logs error and shows banner when backend is down', async () => {
      document.body.innerHTML = '<div id="backend-status" class="backend-status-banner"></div>';
      (global.fetch as jest.Mock).mockRejectedValue(new Error('connect ECONNREFUSED'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      await reportBackendHealth('backend-status');

      expect(errorSpy).toHaveBeenCalledWith(
        'Backend connectivity check failed:',
        expect.stringContaining('Backend is unreachable')
      );

      const banner = document.getElementById('backend-status') as HTMLDivElement;
      expect(banner.className).toContain('show');

      errorSpy.mockRestore();
    });

    it('logs info and clears banner when backend is healthy', async () => {
      document.body.innerHTML = '<div id="backend-status" class="backend-status-banner show">X</div>';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' })
      });
      const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

      await reportBackendHealth('backend-status');

      expect(infoSpy).toHaveBeenCalledWith('Backend connectivity check passed');
      const banner = document.getElementById('backend-status') as HTMLDivElement;
      expect(banner.className).toBe('backend-status-banner');
      expect(banner.textContent).toBe('');

      infoSpy.mockRestore();
    });
  });
});