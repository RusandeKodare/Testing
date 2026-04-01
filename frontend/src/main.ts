import { AuthApiService } from './services/AuthApiService.js';
import { LoginForm } from './components/LoginForm.js';

document.addEventListener('DOMContentLoaded', () => {
  const authService = new AuthApiService();
  const loginForm = new LoginForm(authService);
  loginForm.initialize();
});
