import { AuthApiService } from './services/AuthApiService.js';
import { LoginForm } from './components/LoginForm.js';
import { reportBackendHealth } from './utils/backendHealth.js';
import { initializeCsrfToken } from './utils/csrf.js';

// Global error handler for unimplemented features
window.addEventListener('error', () => {
  console.error('An unexpected client error occurred.');
  showNotImplementedPopup();
});

function showNotImplementedPopup(): void {
  // Check if popup already exists
  let popup = document.getElementById('not-implemented-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'not-implemented-popup';
    popup.className = 'not-implemented-popup';

    const title = document.createElement('h2');
    title.className = 'not-implemented-popup-title';
    title.textContent = 'Not Yet Implemented';

    const message = document.createElement('p');
    message.className = 'not-implemented-popup-message';
    message.textContent = 'This feature is not yet available.';

    const closeButton = document.createElement('button');
    closeButton.className = 'not-implemented-popup-button';
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => {
      const p = document.getElementById('not-implemented-popup');
      if (p) p.remove();
      const o = document.getElementById('popup-overlay');
      if (o) o.remove();
    });

    popup.appendChild(title);
    popup.appendChild(message);
    popup.appendChild(closeButton);
    
    // Add overlay
    const overlay = document.createElement('div');
    overlay.id = 'popup-overlay';
    overlay.className = 'popup-overlay';
    overlay.onclick = () => {
      const o = document.getElementById('popup-overlay');
      const p = document.getElementById('not-implemented-popup');
      if (o) o.remove();
      if (p) p.remove();
    };
    
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  void reportBackendHealth('backend-status');

  try {
    await initializeCsrfToken();
    const authService = new AuthApiService();
    const loginForm = new LoginForm(authService);
    loginForm.initialize();
  } catch (error) {
    console.error('Failed to initialize login form.');
    showNotImplementedPopup();
  }
});
