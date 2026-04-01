import { AuthApiService } from './services/AuthApiService';
import { LoginForm } from './components/LoginForm';

document.addEventListener('DOMContentLoaded', () => {
  const authService = new AuthApiService();
  const loginForm = new LoginForm(authService);
  loginForm.initialize();
});
