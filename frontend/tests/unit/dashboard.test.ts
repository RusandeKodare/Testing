import { Dashboard } from '../../src/dashboard';

global.fetch = jest.fn();

const buildDashboardDom = (): void => {
  document.body.innerHTML = `
    <div id="backend-status-dashboard" class="backend-status-banner"></div>
    <span id="username"></span>
    <span id="username-detail"></span>
    <span id="username-hero"></span>
    <span id="username-nav"></span>
    <span id="login-time"></span>
    <details class="profile-menu" open>
      <summary class="profile-menu-trigger">Menu</summary>
      <div class="profile-menu-content"><button id="profile-menu-inside" type="button">Inside</button></div>
    </details>
    <div id="outside-target">Outside</div>
    <button id="logout-btn"></button>
    <button class="logout-btn-nav"></button>
    <button class="action-btn-large"></button>
    <button id="change-avatar-btn"></button>
    <input id="avatar-input" type="file" />

    <form id="email-settings-form" class="settings-form">
      <div class="email-current-row">
        <span id="current-email-value" data-email=""></span>
        <button type="button" id="edit-email-btn">Edit</button>
      </div>
      <div id="email-edit-container" class="is-hidden">
        <input id="settings-email-input" type="email" />
        <button id="save-email-btn" type="submit">Save</button>
        <button id="cancel-email-btn" type="button">Cancel</button>
      </div>
      <div id="email-settings-message" class="settings-message"></div>
    </form>

    <form id="password-settings-form" class="settings-form">
      <input id="settings-current-password" type="password" />
      <input id="settings-new-password" type="password" />
      <input id="settings-confirm-password" type="password" />
      <button type="submit">Save Password</button>
      <div id="password-settings-message" class="settings-message"></div>
    </form>

    <img id="profile-avatar" src="" />
    <img id="profile-avatar-nav" src="" />
    <span id="profile-upload-feedback"></span>
  `;
};

describe('Dashboard email settings', () => {
  beforeEach(() => {
    buildDashboardDom();
    jest.clearAllMocks();
  });

  it('loads current email and keeps edit input hidden by default', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        settings: {
          email: 'current@example.com',
          hasPassword: true
        }
      })
    });

    const dashboard = new Dashboard();
    await (dashboard as any).loadProfileSettings();

    const currentEmail = document.getElementById('current-email-value') as HTMLElement;
    const editContainer = document.getElementById('email-edit-container') as HTMLElement;
    const editButton = document.getElementById('edit-email-btn') as HTMLElement;

    expect(currentEmail.textContent).toBe('current@example.com');
    expect(editContainer.classList.contains('is-hidden')).toBe(true);
    expect(editButton.classList.contains('is-hidden')).toBe(false);
  });

  it('supports edit and save flow for email settings', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        email: 'updated@example.com'
      })
    });

    const dashboard = new Dashboard();
    (dashboard as any).setupProfileSettingsHandlers();
    (dashboard as any).setCurrentEmail('current@example.com');

    const editButton = document.getElementById('edit-email-btn') as HTMLButtonElement;
    const form = document.getElementById('email-settings-form') as HTMLFormElement;
    const emailInput = document.getElementById('settings-email-input') as HTMLInputElement;
    const editContainer = document.getElementById('email-edit-container') as HTMLElement;
    const currentEmail = document.getElementById('current-email-value') as HTMLElement;

    editButton.click();
    expect(editContainer.classList.contains('is-hidden')).toBe(false);
    expect(emailInput.value).toBe('current@example.com');

    emailInput.value = 'updated@example.com';
    form.dispatchEvent(new Event('submit'));

    await Promise.resolve();
    await Promise.resolve();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/profile/settings/email',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ email: 'updated@example.com' }),
        credentials: 'include'
      })
    );

    expect(currentEmail.textContent).toBe('updated@example.com');
    expect(editContainer.classList.contains('is-hidden')).toBe(true);
    expect(editButton.classList.contains('is-hidden')).toBe(false);
  });
});

describe('Dashboard profile menu behavior', () => {
  beforeEach(() => {
    buildDashboardDom();
    jest.clearAllMocks();
  });

  it('closes the menu when clicking outside', () => {
    const dashboard = new Dashboard();
    (dashboard as any).setupProfileMenuBehavior();

    const menu = document.querySelector('.profile-menu') as HTMLDetailsElement;
    expect(menu.open).toBe(true);

    const outside = document.getElementById('outside-target') as HTMLElement;
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(menu.open).toBe(false);
  });
});
