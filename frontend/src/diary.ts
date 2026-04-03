import { reportBackendHealth } from './utils/backendHealth.js';
import { initializeCsrfToken } from './utils/csrf.js';
import { DiaryApiService } from './services/DiaryApiService.js';
import { setupProfileMenuBehavior } from './utils/profileMenu.js';
import { toLocalDateTimeInputValue } from './utils/dateTimeLocal.js';

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

class DiaryPage {
  private api = new DiaryApiService();
  private editingEntryId: number | null = null;

  async initialize(): Promise<void> {
    void reportBackendHealth('backend-status-dashboard');

    try {
      await initializeCsrfToken();
    } catch {
      this.showMessage('Unable to initialize security token. Please refresh.', false);
    }

    const loaded = await this.loadSessionUser();
    if (!loaded) {
      window.location.href = '/';
      return;
    }

    this.setupEventListeners();
    this.setDefaultEntryDate();
    await this.tryLoadEntryForEditing();
  }

  private async loadSessionUser(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/me`, { credentials: 'include' });
      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      if (!result?.success || !result?.user?.username) {
        return false;
      }

      const usernameElements = document.querySelectorAll('#username-nav, #diary-username');
      usernameElements.forEach((el) => {
        el.textContent = result.user.username;
      });

      if (result.user.profilePicture) {
        const avatarImages = document.querySelectorAll('#profile-avatar-nav') as NodeListOf<HTMLImageElement>;
        avatarImages.forEach((img) => {
          img.src = result.user.profilePicture;
        });
      }

      return true;
    } catch {
      return false;
    }
  }

  private setupEventListeners(): void {
    const form = document.getElementById('diary-entry-form') as HTMLFormElement | null;
    const resetButton = document.getElementById('diary-reset-btn') as HTMLButtonElement | null;
    const logoutButton = document.getElementById('logout-btn') as HTMLButtonElement | null;
    const openEntriesButtons = [
      document.getElementById('diary-jump-all-btn') as HTMLButtonElement | null,
      document.getElementById('diary-open-all-btn') as HTMLButtonElement | null
    ];

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        void this.saveEntry();
      });
    }

    if (resetButton) {
      resetButton.addEventListener('click', () => this.resetForm());
    }

    openEntriesButtons.forEach((button) => {
      if (!button) {
        return;
      }

      button.addEventListener('click', () => {
        window.location.href = '/diary-entries.html';
      });
    });

    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        void this.logout();
      });
    }

    this.setupProfileMenuBehavior();
  }

  private async tryLoadEntryForEditing(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const editId = Number(params.get('edit') || '0');
    if (!Number.isInteger(editId) || editId <= 0) {
      return;
    }

    const response = await this.api.getEntry(editId);
    if (!response.success || !response.entry) {
      this.showMessage(response.message || 'Could not load selected entry for editing', false);
      return;
    }

    this.populateForm(response.entry);
    this.showMessage('Editing selected entry', true);
  }

  private setupProfileMenuBehavior(): void {
    setupProfileMenuBehavior('.profile-menu');
  }

  private buildPayload(): Record<string, unknown> {
    const titleInput = document.getElementById('diary-title') as HTMLInputElement | null;
    const contentInput = document.getElementById('diary-content') as HTMLTextAreaElement | null;
    const moodInput = document.getElementById('diary-mood') as HTMLSelectElement | null;
    const tagsInput = document.getElementById('diary-tags') as HTMLInputElement | null;
    const favoriteInput = document.getElementById('diary-favorite') as HTMLInputElement | null;
    const dateInput = document.getElementById('diary-entry-date') as HTMLInputElement | null;

    const tags = (tagsInput?.value || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    return {
      title: titleInput?.value || '',
      content: contentInput?.value || '',
      mood: moodInput?.value || null,
      tags,
      isFavorite: Boolean(favoriteInput?.checked),
      entryDate: dateInput?.value ? new Date(dateInput.value).toISOString() : new Date().toISOString()
    };
  }

  private async saveEntry(): Promise<void> {
    const payload = this.buildPayload();

    const response = this.editingEntryId
      ? await this.api.updateEntry(this.editingEntryId, payload)
      : await this.api.createEntry(payload);

    if (!response.success) {
      this.showMessage(response.message || 'Unable to save entry', false);
      return;
    }

    this.showMessage(this.editingEntryId ? 'Entry updated' : 'Entry saved', true);
    this.resetForm();
  }

  private populateForm(entry: {
    id: number;
    title: string;
    content: string;
    mood: string | null;
    tags: string[];
    isFavorite: boolean;
    entryDate: string;
  }): void {
    this.editingEntryId = entry.id;

    const titleInput = document.getElementById('diary-title') as HTMLInputElement | null;
    const contentInput = document.getElementById('diary-content') as HTMLTextAreaElement | null;
    const moodInput = document.getElementById('diary-mood') as HTMLSelectElement | null;
    const tagsInput = document.getElementById('diary-tags') as HTMLInputElement | null;
    const favoriteInput = document.getElementById('diary-favorite') as HTMLInputElement | null;
    const dateInput = document.getElementById('diary-entry-date') as HTMLInputElement | null;
    const submitButton = document.getElementById('diary-save-btn') as HTMLButtonElement | null;

    if (titleInput) titleInput.value = entry.title;
    if (contentInput) contentInput.value = entry.content;
    if (moodInput) moodInput.value = entry.mood || '';
    if (tagsInput) tagsInput.value = entry.tags.join(', ');
    if (favoriteInput) favoriteInput.checked = entry.isFavorite;
    if (dateInput) dateInput.value = toLocalDateTimeInputValue(entry.entryDate);
    if (submitButton) submitButton.textContent = 'Update Entry';
  }

  private resetForm(): void {
    const form = document.getElementById('diary-entry-form') as HTMLFormElement | null;
    const submitButton = document.getElementById('diary-save-btn') as HTMLButtonElement | null;

    this.editingEntryId = null;
    if (form) {
      form.reset();
    }

    this.setDefaultEntryDate(true);

    if (submitButton) {
      submitButton.textContent = 'Save Entry';
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('edit');
    window.history.replaceState({}, '', url.toString());
  }

  private setDefaultEntryDate(force = false): void {
    const dateInput = document.getElementById('diary-entry-date') as HTMLInputElement | null;
    if (!dateInput) {
      return;
    }

    if (!force && dateInput.value) {
      return;
    }

    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    dateInput.value = localDate.toISOString().slice(0, 16);
  }

  private showMessage(message: string, isSuccess: boolean): void {
    const messageElement = document.getElementById('diary-message');
    if (!messageElement) {
      return;
    }

    messageElement.textContent = message;
    messageElement.className = `settings-message ${isSuccess ? 'success' : 'error'} show`;
  }

  private async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch {
      // Continue redirect flow if logout request fails.
    }

    window.location.href = '/';
  }

}

document.addEventListener('DOMContentLoaded', () => {
  const page = new DiaryPage();
  void page.initialize();
});
