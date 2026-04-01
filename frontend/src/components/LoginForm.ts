import { AuthApiService } from '../services/AuthApiService.js';
import { Validator } from '../utils/validator.js';

export class LoginForm {
  private authService: AuthApiService;

  constructor(authService: AuthApiService) {
    this.authService = authService;
  }

  handleTabSwitch(): void {
    const tabs = document.querySelectorAll('.tab');
    const forms = document.querySelectorAll('.form-container');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');

        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(f => f.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(`${targetTab}-form`)?.classList.add('active');

        this.clearMessages();
        this.clearErrors();
      });
    });
  }

  handleLoginSubmit(): void {
    const form = document.getElementById('login-form-element') as HTMLFormElement;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.clearErrors();

      const username = (document.getElementById('login-username') as HTMLInputElement).value;
      const password = (document.getElementById('login-password') as HTMLInputElement).value;

      const usernameValidation = Validator.validateUsername(username);
      const passwordValidation = Validator.validatePassword(password);

      if (!usernameValidation.isValid) {
        this.showFieldError('login-username', usernameValidation.error!);
        return;
      }

      if (!passwordValidation.isValid) {
        this.showFieldError('login-password', passwordValidation.error!);
        return;
      }

      const button = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      button.disabled = true;
      button.textContent = 'Logging in...';

      try {
        const result = await this.authService.login({ username, password });

        if (result.success) {
          this.showMessage('login-message', 'Login successful! Redirecting...', 'success');
          form.reset();
          
          if (result.token) {
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('username', username);
            
            setTimeout(() => {
              window.location.href = '/dashboard.html';
            }, 1000);
          }
        } else {
          this.showMessage('login-message', result.message, 'error');
        }
      } catch (error) {
        this.showMessage('login-message', 'Network error. Please try again.', 'error');
      } finally {
        button.disabled = false;
        button.textContent = 'Login';
      }
    });
  }

  handleRegisterSubmit(): void {
    const form = document.getElementById('register-form-element') as HTMLFormElement;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.clearErrors();

      const username = (document.getElementById('register-username') as HTMLInputElement).value;
      const password = (document.getElementById('register-password') as HTMLInputElement).value;
      const confirmPassword = (document.getElementById('register-confirm-password') as HTMLInputElement)?.value || '';

      const usernameValidation = Validator.validateUsername(username);
      const passwordValidation = Validator.validatePassword(password);
      const passwordMatchValidation = Validator.validatePasswordMatch(password, confirmPassword);

      if (!usernameValidation.isValid) {
        this.showFieldError('register-username', usernameValidation.error!);
        return;
      }

      if (!passwordValidation.isValid) {
        this.showFieldError('register-password', passwordValidation.error!);
        return;
      }

      if (!passwordMatchValidation.isValid) {
        this.showFieldError('register-confirm-password', passwordMatchValidation.error!);
        return;
      }

      const button = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      button.disabled = true;
      button.textContent = 'Creating account...';

      try {
        const result = await this.authService.register({ 
          username, 
          password,
          confirmPassword
        });

        if (result.success) {
          this.showMessage('register-message', 'Registration successful! Please login.', 'success');
          form.reset();
          
          if (result.token) {
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('username', username);
          }
          
          setTimeout(() => {
            const loginTab = document.querySelector('[data-tab="login"]') as HTMLElement;
            if (loginTab) loginTab.click();
          }, 1500);
        } else {
          this.showMessage('register-message', result.message, 'error');
        }
      } catch (error) {
        this.showMessage('register-message', 'Network error. Please try again.', 'error');
      } finally {
        button.disabled = false;
        button.textContent = 'Register';
      }
    });
  }

  private showFieldError(fieldId: string, message: string): void {
    const errorElement = document.getElementById(`${fieldId}-error`);
    const inputElement = document.getElementById(fieldId);
    
    if (errorElement) {
      errorElement.textContent = message;
    }
    
    if (inputElement) {
      inputElement.classList.add('error');
    }
  }

  private showMessage(elementId: string, message: string, type: 'success' | 'error'): void {
    const messageElement = document.getElementById(elementId);
    
    if (messageElement) {
      messageElement.textContent = message;
      messageElement.className = `message ${type} show`;

      setTimeout(() => {
        messageElement.classList.remove('show');
      }, 5000);
    }
  }

  private clearErrors(): void {
    document.querySelectorAll('.error').forEach(el => {
      (el as HTMLElement).textContent = '';
    });
    
    document.querySelectorAll('input').forEach(input => {
      input.classList.remove('error');
    });
  }

  private clearMessages(): void {
    document.querySelectorAll('.message').forEach(msg => {
      msg.classList.remove('show');
      (msg as HTMLElement).textContent = '';
    });
  }

  initialize(): void {
    this.handleTabSwitch();
    this.handleLoginSubmit();
    this.handleRegisterSubmit();
  }
}
