interface HealthResponse {
  status?: string;
}

export interface BackendHealthResult {
  isAvailable: boolean;
  message: string;
}

const DEFAULT_HEALTH_URL = 'http://localhost:3000/api/health';

export async function checkBackendHealth(healthUrl: string = DEFAULT_HEALTH_URL): Promise<BackendHealthResult> {
  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return {
        isAvailable: false,
        message: `Backend health endpoint returned HTTP ${response.status}`
      };
    }

    const payload = await response.json() as HealthResponse;
    if (payload.status !== 'ok') {
      return {
        isAvailable: false,
        message: 'Backend health endpoint returned an unexpected payload'
      };
    }

    return {
      isAvailable: true,
      message: 'Backend is reachable'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
    return {
      isAvailable: false,
      message: `Backend is unreachable: ${errorMessage}`
    };
  }
}

export function updateBackendStatusBanner(elementId: string, result: BackendHealthResult): void {
  const banner = document.getElementById(elementId);
  if (!banner) {
    return;
  }

  if (result.isAvailable) {
    banner.textContent = '';
    banner.className = 'backend-status-banner';
    return;
  }

  banner.textContent = 'Backend is currently unavailable. Please ensure the API server is running on http://localhost:3000.';
  banner.className = 'backend-status-banner show';
}

export async function reportBackendHealth(elementId: string): Promise<void> {
  const healthResult = await checkBackendHealth();

  if (!healthResult.isAvailable) {
    console.error('Backend connectivity check failed:', healthResult.message);
  } else {
    console.info('Backend connectivity check passed');
  }

  updateBackendStatusBanner(elementId, healthResult);
}