import { AuthApiService } from './services/AuthApiService.js';
import { LoginForm } from './components/LoginForm.js';
import { reportBackendHealth } from './utils/backendHealth.js';

// Global error handler for unimplemented features
window.addEventListener('error', (event) => {
  console.error('Error:', event.error);
  showNotImplementedPopup();
});

function showNotImplementedPopup(): void {
  // Check if popup already exists
  let popup = document.getElementById('not-implemented-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'not-implemented-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      text-align: center;
      font-family: Arial, sans-serif;
    `;
    
    popup.innerHTML = `
      <h2 style="margin: 0 0 15px 0; color: #333;">Not Yet Implemented</h2>
      <p style="margin: 0 0 20px 0; color: #666;">This feature is not yet available.</p>
      <button onclick="const p = document.getElementById('not-implemented-popup'); if (p) p.remove();" 
              style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
        Close
      </button>
    `;
    
    // Add overlay
    const overlay = document.createElement('div');
    overlay.id = 'popup-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
    `;
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

document.addEventListener('DOMContentLoaded', () => {
  void reportBackendHealth('backend-status');

  try {
    const authService = new AuthApiService();
    const loginForm = new LoginForm(authService);
    loginForm.initialize();
  } catch (error) {
    console.error('Error initializing LoginForm:', error);
    showNotImplementedPopup();
  }
});
