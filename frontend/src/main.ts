import { AuthApiService } from './services/AuthApiService.js';
import { LoginForm } from './components/LoginForm.js';
import { reportBackendHealth } from './utils/backendHealth.js';
import { initializeCsrfToken } from './utils/csrf.js';

function showInitWarning(message: string): void {
  const loginMessage = document.getElementById('login-message');
  if (loginMessage) {
    loginMessage.textContent = message;
    loginMessage.className = 'message error show';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  void reportBackendHealth('backend-status');

  const authService = new AuthApiService();
  const loginForm = new LoginForm(authService);
  loginForm.initialize();

  try {
    await initializeCsrfToken();
  } catch {
    console.warn('Security token initialization failed on login page.');
    showInitWarning('Temporary security sync issue. If login fails, refresh once and try again.');
  }
});
