import { LoginForm } from '../../../src/components/LoginForm';
import { AuthApiService } from '../../../src/services/AuthApiService';

jest.mock('../../../src/services/AuthApiService');

describe('LoginForm', () => {
  let loginForm: LoginForm;
  let mockAuthService: jest.Mocked<AuthApiService>;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="tabs">
        <button class="tab active" data-tab="login">Login</button>
        <button class="tab" data-tab="register">Register</button>
      </div>
      <div id="login-form" class="form-container active">
        <form id="login-form-element">
          <input type="text" id="login-username" />
          <input type="password" id="login-password" />
          <span id="login-username-error"></span>
          <span id="login-password-error"></span>
          <button type="submit">Login</button>
          <div id="login-message"></div>
        </form>
      </div>
      <div id="register-form" class="form-container">
        <form id="register-form-element">
          <input type="text" id="register-username" />
          <input type="password" id="register-password" />
          <span id="register-username-error"></span>
          <span id="register-password-error"></span>
          <button type="submit">Register</button>
          <div id="register-message"></div>
        </form>
      </div>
    `;

    mockAuthService = new AuthApiService() as jest.Mocked<AuthApiService>;
    loginForm = new LoginForm(mockAuthService);

    jest.spyOn(Storage.prototype, 'setItem');
    Storage.prototype.setItem = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleTabSwitch', () => {
    it('should switch between tabs', () => {
      loginForm.handleTabSwitch();

      const registerTab = document.querySelector('[data-tab="register"]') as HTMLElement;
      registerTab.click();

      expect(registerTab.classList.contains('active')).toBe(true);
      expect(document.getElementById('register-form')?.classList.contains('active')).toBe(true);
    });
  });

  describe('handleLoginSubmit', () => {
    it('should show error for invalid username', () => {
      loginForm.handleLoginSubmit();

      const usernameInput = document.getElementById('login-username') as HTMLInputElement;
      const passwordInput = document.getElementById('login-password') as HTMLInputElement;
      const form = document.getElementById('login-form-element') as HTMLFormElement;

      usernameInput.value = 'ab';
      passwordInput.value = 'password123';

      form.dispatchEvent(new Event('submit'));

      const error = document.getElementById('login-username-error')?.textContent;
      expect(error).toBe('Username must be at least 3 characters');
    });

    it('should show error for invalid password', () => {
      loginForm.handleLoginSubmit();

      const usernameInput = document.getElementById('login-username') as HTMLInputElement;
      const passwordInput = document.getElementById('login-password') as HTMLInputElement;
      const form = document.getElementById('login-form-element') as HTMLFormElement;

      usernameInput.value = 'testuser';
      passwordInput.value = 'short';

      form.dispatchEvent(new Event('submit'));

      const error = document.getElementById('login-password-error')?.textContent;
      expect(error).toBe('Password must be at least 8 characters');
    });

    it('should call auth service on valid submission', async () => {
      mockAuthService.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
        token: 'token123',
        user: { id: 1, username: 'testuser' }
      });

      loginForm.handleLoginSubmit();

      const usernameInput = document.getElementById('login-username') as HTMLInputElement;
      const passwordInput = document.getElementById('login-password') as HTMLInputElement;
      const form = document.getElementById('login-form-element') as HTMLFormElement;

      usernameInput.value = 'testuser';
      passwordInput.value = 'password123';

      form.dispatchEvent(new Event('submit'));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAuthService.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123'
      });
    });
  });

  describe('handleRegisterSubmit', () => {
    it('should show error for password without number', () => {
      loginForm.handleRegisterSubmit();

      const usernameInput = document.getElementById('register-username') as HTMLInputElement;
      const passwordInput = document.getElementById('register-password') as HTMLInputElement;
      const form = document.getElementById('register-form-element') as HTMLFormElement;

      usernameInput.value = 'testuser';
      passwordInput.value = 'password';

      form.dispatchEvent(new Event('submit'));

      const error = document.getElementById('register-password-error')?.textContent;
      expect(error).toBe('Password must contain at least 1 number');
    });

    it('should call auth service on valid registration', async () => {
      mockAuthService.register.mockResolvedValue({
        success: true,
        message: 'Registration successful',
        token: 'token123',
        user: { id: 1, username: 'newuser' }
      });

      loginForm.handleRegisterSubmit();

      const usernameInput = document.getElementById('register-username') as HTMLInputElement;
      const passwordInput = document.getElementById('register-password') as HTMLInputElement;
      const form = document.getElementById('register-form-element') as HTMLFormElement;

      usernameInput.value = 'newuser';
      passwordInput.value = 'password123';

      form.dispatchEvent(new Event('submit'));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAuthService.register).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'password123'
      });
    });
  });

  describe('initialize', () => {
    it('should set up all event handlers', () => {
      const handleTabSwitchSpy = jest.spyOn(loginForm, 'handleTabSwitch');
      const handleLoginSubmitSpy = jest.spyOn(loginForm, 'handleLoginSubmit');
      const handleRegisterSubmitSpy = jest.spyOn(loginForm, 'handleRegisterSubmit');

      loginForm.initialize();

      expect(handleTabSwitchSpy).toHaveBeenCalled();
      expect(handleLoginSubmitSpy).toHaveBeenCalled();
      expect(handleRegisterSubmitSpy).toHaveBeenCalled();
    });
  });
});
