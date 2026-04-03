import { reportBackendHealth } from './utils/backendHealth.js';
import { initializeCsrfToken } from './utils/csrf.js';
import { DiaryApiService, DiaryEntryDto } from './services/DiaryApiService.js';

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
    await this.loadEntries();
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
    const filters = document.querySelectorAll('.diary-filter');
    const logoutButton = document.getElementById('logout-btn') as HTMLButtonElement | null;
    const openAllButtons = [
      document.getElementById('diary-jump-all-btn') as HTMLButtonElement | null,
      document.getElementById('diary-open-all-btn') as HTMLButtonElement | null
    ];
    const backToComposerButton = document.getElementById('diary-back-compose-btn') as HTMLButtonElement | null;

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        void this.saveEntry();
      });
    }

    if (resetButton) {
      resetButton.addEventListener('click', () => this.resetForm());
    }

    openAllButtons.forEach((button) => {
      if (!button) {
        return;
      }

      button.addEventListener('click', () => {
        document.getElementById('all-entries-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    if (backToComposerButton) {
      backToComposerButton.addEventListener('click', () => {
        document.getElementById('compose-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    filters.forEach((input) => {
      input.addEventListener('change', () => {
        void this.loadEntries();
      });
      input.addEventListener('input', () => {
        void this.loadEntries();
      });
    });

    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        void this.logout();
      });
    }

    this.setupProfileMenuBehavior();
  }

  private setupProfileMenuBehavior(): void {
    const menus = Array.from(document.querySelectorAll<HTMLDetailsElement>('.profile-menu'));
    if (!menus.length) {
      return;
    }

    document.addEventListener('click', (event) => {
      const target = event.target as Node | null;
      menus.forEach((menu) => {
        if (menu.open && target && !menu.contains(target)) {
          menu.removeAttribute('open');
        }
      });
    });
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
    await this.loadEntries();
  }

  private async loadEntries(): Promise<void> {
    const searchInput = document.getElementById('diary-search') as HTMLInputElement | null;
    const moodFilterInput = document.getElementById('diary-filter-mood') as HTMLSelectElement | null;
    const tagFilterInput = document.getElementById('diary-filter-tag') as HTMLInputElement | null;
    const favoriteOnlyInput = document.getElementById('diary-filter-favorite') as HTMLInputElement | null;

    const response = await this.api.listEntries({
      search: searchInput?.value.trim() || undefined,
      mood: moodFilterInput?.value || undefined,
      tag: tagFilterInput?.value.trim().toLowerCase() || undefined,
      favorite: favoriteOnlyInput?.checked ? 'true' : undefined,
      limit: '50'
    });

    if (!response.success) {
      this.showMessage(response.message || 'Unable to load entries', false);
      return;
    }

    this.renderEntries(response.entries || []);
  }

  private renderEntries(entries: DiaryEntryDto[]): void {
    const list = document.getElementById('diary-entries-list');
    if (!list) {
      return;
    }

    if (!entries.length) {
      list.innerHTML = '<p class="diary-empty">No diary entries found. Start by writing your first entry.</p>';
      return;
    }

    list.innerHTML = entries
      .map((entry) => {
        const mood = entry.mood ? `<span class="diary-chip">Mood: ${entry.mood}</span>` : '';
        const favorite = entry.isFavorite ? '<span class="diary-chip diary-chip-fav">Favorite</span>' : '';
        const tags = entry.tags.map((tag) => `<span class="diary-chip">#${tag}</span>`).join('');

        return `
          <article class="diary-entry-card" data-entry-id="${entry.id}">
            <header class="diary-entry-header">
              <h3>${this.escapeHtml(entry.title)}</h3>
              <small>${new Date(entry.entryDate).toLocaleString()}</small>
            </header>
            <p>${this.escapeHtml(entry.content)}</p>
            <div class="diary-meta">${mood}${favorite}${tags}</div>
            <div class="diary-actions">
              <button type="button" class="settings-btn diary-edit-btn" data-entry-id="${entry.id}">Edit</button>
              <button type="button" class="settings-btn settings-btn-secondary diary-delete-btn" data-entry-id="${entry.id}">Delete</button>
            </div>
          </article>
        `;
      })
      .join('');

    list.querySelectorAll('.diary-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number((btn as HTMLElement).getAttribute('data-entry-id') || '0');
        const entry = entries.find((item) => item.id === id);
        if (entry) {
          this.populateForm(entry);
        }
      });
    });

    list.querySelectorAll('.diary-delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number((btn as HTMLElement).getAttribute('data-entry-id') || '0');
        void this.deleteEntry(id);
      });
    });
  }

  private populateForm(entry: DiaryEntryDto): void {
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
    if (dateInput) dateInput.value = entry.entryDate.slice(0, 16);
    if (submitButton) submitButton.textContent = 'Update Entry';
  }

  private async deleteEntry(entryId: number): Promise<void> {
    if (!entryId) {
      return;
    }

    const response = await this.api.deleteEntry(entryId);
    if (!response.success) {
      this.showMessage(response.message || 'Failed to delete entry', false);
      return;
    }

    if (this.editingEntryId === entryId) {
      this.resetForm();
    }

    this.showMessage('Entry deleted', true);
    await this.loadEntries();
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

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const page = new DiaryPage();
  void page.initialize();
});
