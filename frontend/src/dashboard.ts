import { reportBackendHealth } from './utils/backendHealth.js';
import { getCsrfTokenFromCookie, initializeCsrfToken } from './utils/csrf.js';
import { setupProfileMenuBehavior } from './utils/profileMenu.js';

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

export class Dashboard {
  private username: string | null = null;
  private uploadFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  private setEmailEditing(isEditing: boolean): void {
    const editContainer = document.getElementById('email-edit-container');
    const editButton = document.getElementById('edit-email-btn');

    if (!editContainer || !editButton) {
      return;
    }

    editContainer.classList.toggle('is-hidden', !isEditing);
    editButton.classList.toggle('is-hidden', isEditing);
  }

  private setCurrentEmail(email: string): void {
    const currentEmailValue = document.getElementById('current-email-value');
    const normalized = email.trim();
    const safeEmail = normalized || 'Not set';

    if (currentEmailValue) {
      currentEmailValue.textContent = safeEmail;
      currentEmailValue.setAttribute('data-email', normalized);
    }
  }

  private getStoredCurrentEmail(): string {
    const currentEmailValue = document.getElementById('current-email-value');
    return currentEmailValue?.getAttribute('data-email') || '';
  }

  async initialize(): Promise<void> {
    void reportBackendHealth('backend-status-dashboard');
    try {
      await initializeCsrfToken();
    } catch {
      console.error('Failed to initialize CSRF token for dashboard. Continuing with session init.');
    }
    await this.initializeSession();
  }

  private async initializeSession(): Promise<void> {
    const loaded = await this.loadSessionUser();
    if (!loaded) {
      this.redirectToLogin();
      return;
    }

    this.loadUserInfo();
    this.setupEventListeners();
  }

  private async loadSessionUser(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      if (!result?.success || !result?.user?.id || !result?.user?.username) {
        return false;
      }

      this.username = result.user.username;
      return true;
    } catch {
      return false;
    }
  }

  private loadUserInfo(): void {
    const usernameElements = document.querySelectorAll('#username, #username-detail, #username-hero, #username-nav');
    usernameElements.forEach(el => {
      if (el) el.textContent = this.username || 'User';
    });

    const loginTimeElement = document.getElementById('login-time');
    if (loginTimeElement) {
      loginTimeElement.textContent = new Date().toLocaleString();
    }
  }

  private setupEventListeners(): void {
    const logoutButtons = document.querySelectorAll('#logout-btn, .logout-btn-nav');
    logoutButtons.forEach(btn => {
      btn.addEventListener('click', () => this.logout());
    });

    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const avatarInput = document.getElementById('avatar-input') as HTMLInputElement;

    if (changeAvatarBtn) {
      changeAvatarBtn.addEventListener('click', () => {
        avatarInput?.click();
      });
    }

    if (avatarInput) {
      avatarInput.addEventListener('change', (e) => this.handleProfilePictureChange(e));
    }

    this.setupProfileSettingsHandlers();
    this.setupSettingsTabs();
    this.setupProfileMenuBehavior();
    void this.loadProfilePicture();
    void this.loadProfileSettings();
  }

  private setupProfileMenuBehavior(): void {
    setupProfileMenuBehavior('.profile-menu');
  }

  private setupSettingsTabs(): void {
    const tabs = document.querySelectorAll<HTMLButtonElement>('.settings-tab-btn');
    const panels = document.querySelectorAll<HTMLElement>('.settings-panel');

    if (!tabs.length || !panels.length) {
      return;
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-settings-tab');
        if (!target) {
          return;
        }

        tabs.forEach((entry) => entry.classList.remove('active'));
        panels.forEach((panel) => panel.classList.remove('active'));

        tab.classList.add('active');
        const panel = document.getElementById(`settings-panel-${target}`);
        panel?.classList.add('active');
      });
    });
  }

  private async handleProfilePictureChange(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showProfileUploadFeedback('Please select a valid image file', false);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.showProfileUploadFeedback('File size must be less than 5MB', false);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;

      try {
        const response = await fetch(`${API_BASE_URL}/api/profile/picture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfTokenFromCookie()
          },
          body: JSON.stringify({
            profilePicture: dataUrl,
          }),
          credentials: 'include',
        });

        const result = await response.json();

        if (result.success) {
          const avatarImages = document.querySelectorAll('#profile-avatar, #profile-avatar-nav') as NodeListOf<HTMLImageElement>;
          avatarImages.forEach(img => {
            img.src = result.profilePicture || dataUrl;
          });
          this.showProfileUploadFeedback('Profile picture updated', true);
        } else {
          this.showProfileUploadFeedback(result.message || 'Failed to update profile picture', false);
        }
      } catch {
        console.error('Failed to upload profile picture.');
        this.showProfileUploadFeedback('Failed to upload profile picture. Please try again.', false);
      }
    };
    reader.readAsDataURL(file);
  }

  private setupProfileSettingsHandlers(): void {
    const emailForm = document.getElementById('email-settings-form') as HTMLFormElement | null;
    const passwordForm = document.getElementById('password-settings-form') as HTMLFormElement | null;
    const editEmailButton = document.getElementById('edit-email-btn') as HTMLButtonElement | null;
    const cancelEmailButton = document.getElementById('cancel-email-btn') as HTMLButtonElement | null;

    if (editEmailButton) {
      editEmailButton.addEventListener('click', () => {
        const emailInput = document.getElementById('settings-email-input') as HTMLInputElement | null;
        if (emailInput) {
          emailInput.value = this.getStoredCurrentEmail();
          emailInput.focus();
        }
        this.setEmailEditing(true);
      });
    }

    if (cancelEmailButton) {
      cancelEmailButton.addEventListener('click', () => {
        const emailInput = document.getElementById('settings-email-input') as HTMLInputElement | null;
        if (emailInput) {
          emailInput.value = this.getStoredCurrentEmail();
        }
        this.showSettingsMessage('email-settings-message', '', true);
        this.setEmailEditing(false);
      });
    }

    if (emailForm) {
      emailForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const emailInput = document.getElementById('settings-email-input') as HTMLInputElement | null;
        const email = emailInput?.value.trim() || '';

        if (!email) {
          this.showSettingsMessage('email-settings-message', 'Email is required', false);
          return;
        }

        const submitButton = emailForm.querySelector('button[type="submit"]') as HTMLButtonElement | null;
        if (submitButton) {
          submitButton.disabled = true;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/api/profile/settings/email`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfTokenFromCookie()
            },
            body: JSON.stringify({ email }),
            credentials: 'include'
          });

          const result = await response.json();

          if (response.ok && result.success) {
            const savedEmail = typeof result.email === 'string' ? result.email : email;
            this.setCurrentEmail(savedEmail);
            this.setEmailEditing(false);
            this.showSettingsMessage('email-settings-message', `Current email: ${savedEmail}`, true);
          } else {
            this.showSettingsMessage('email-settings-message', result.message || 'Failed to save email', false);
          }
        } catch {
          console.error('Failed to update email.');
          this.showSettingsMessage('email-settings-message', 'Failed to save email. Please try again.', false);
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
          }
        }
      });
    }

    if (passwordForm) {
      passwordForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const currentPassword = (document.getElementById('settings-current-password') as HTMLInputElement | null)?.value || '';
        const newPassword = (document.getElementById('settings-new-password') as HTMLInputElement | null)?.value || '';
        const confirmPassword = (document.getElementById('settings-confirm-password') as HTMLInputElement | null)?.value || '';

        if (!newPassword || !confirmPassword) {
          this.showSettingsMessage('password-settings-message', 'New password and confirmation are required', false);
          return;
        }

        const submitButton = passwordForm.querySelector('button[type="submit"]') as HTMLButtonElement | null;
        if (submitButton) {
          submitButton.disabled = true;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/api/profile/settings/password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfTokenFromCookie()
            },
            body: JSON.stringify({
              currentPassword,
              newPassword,
              confirmPassword
            }),
            credentials: 'include'
          });

          const result = await response.json();

          if (response.ok && result.success) {
            this.showSettingsMessage('password-settings-message', 'Password updated successfully', true);
            passwordForm.reset();
          } else {
            this.showSettingsMessage('password-settings-message', result.message || 'Failed to update password', false);
          }
        } catch {
          console.error('Failed to update password.');
          this.showSettingsMessage('password-settings-message', 'Failed to update password. Please try again.', false);
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
          }
        }
      });
    }
  }

  private async loadProfileSettings(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/settings`, {
        credentials: 'include'
      });

      if (!response.ok) {
        return;
      }

      const result = await response.json();
      if (!result.success || !result.settings) {
        return;
      }

      const emailInput = document.getElementById('settings-email-input') as HTMLInputElement | null;
      const currentPasswordInput = document.getElementById('settings-current-password') as HTMLInputElement | null;

      if (emailInput) {
        emailInput.value = result.settings.email || '';
      }

      this.setCurrentEmail(result.settings.email || '');
      this.setEmailEditing(false);

      if (currentPasswordInput && !result.settings.hasPassword) {
        currentPasswordInput.placeholder = 'Not required for OAuth-only accounts';
      }
    } catch {
      console.error('Failed to load profile settings.');
    }
  }

  private showSettingsMessage(elementId: string, message: string, isSuccess: boolean): void {
    const messageElement = document.getElementById(elementId);
    if (!messageElement) {
      return;
    }

    messageElement.textContent = message;
    messageElement.className = `settings-message ${isSuccess ? 'success' : 'error'} show`;
  }

  private showProfileUploadFeedback(message: string, isSuccess: boolean): void {
    const feedback = document.getElementById('profile-upload-feedback');
    if (!feedback) {
      return;
    }

    if (this.uploadFeedbackTimer) {
      clearTimeout(this.uploadFeedbackTimer);
      this.uploadFeedbackTimer = null;
    }

    feedback.textContent = message;
    feedback.style.color = isSuccess ? '#2ee58f' : '#ff8a9a';
    feedback.classList.add('show');

    this.uploadFeedbackTimer = setTimeout(() => {
      feedback.classList.remove('show');
      this.uploadFeedbackTimer = null;
    }, 2200);
  }

  private async loadProfilePicture(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/picture/me`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (result.success && result.profilePicture) {
        const avatarImages = document.querySelectorAll('#profile-avatar, #profile-avatar-nav') as NodeListOf<HTMLImageElement>;
        avatarImages.forEach(img => {
          img.src = result.profilePicture;
        });
      }
    } catch {
      console.error('Failed to load profile picture.');
    }
  }

  private async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': getCsrfTokenFromCookie()
        },
        credentials: 'include',
      });
    } catch {
      // Continue redirect flow if logout request fails.
    }

    this.redirectToLogin();
  }

  private redirectToLogin(): void {
    window.location.href = '/';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const dashboard = new Dashboard();
  void dashboard.initialize();
});
