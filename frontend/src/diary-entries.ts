import { reportBackendHealth } from './utils/backendHealth.js';
import { initializeCsrfToken } from './utils/csrf.js';
import { DiaryApiService, DiaryEntryDto } from './services/DiaryApiService.js';
import { setupProfileMenuBehavior } from './utils/profileMenu.js';

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

class DiaryEntriesPage {
  private api = new DiaryApiService();
  private filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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

      const usernameElements = document.querySelectorAll('#username-nav');
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
    const filters = document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('.diary-filter');
    const logoutButton = document.getElementById('logout-btn') as HTMLButtonElement | null;

    filters.forEach((input) => {
      input.addEventListener('change', () => {
        void this.loadEntries();
      });

      if (input.tagName === 'INPUT' && (input as HTMLInputElement).type === 'text') {
        input.addEventListener('input', () => {
          this.scheduleEntriesReload();
        });
      }
    });

    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        void this.logout();
      });
    }

    this.setupProfileMenuBehavior();
  }

  private scheduleEntriesReload(): void {
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer);
    }

    this.filterDebounceTimer = setTimeout(() => {
      void this.loadEntries();
      this.filterDebounceTimer = null;
    }, 250);
  }

  private setupProfileMenuBehavior(): void {
    setupProfileMenuBehavior('.profile-menu');
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
      list.innerHTML = '<p class="diary-empty">No diary entries found yet.</p>';
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
              <a href="/diary.html?edit=${entry.id}" class="settings-btn diary-link-btn">Edit</a>
              <button type="button" class="settings-btn settings-btn-secondary diary-delete-btn" data-entry-id="${entry.id}">Delete</button>
            </div>
          </article>
        `;
      })
      .join('');

    list.querySelectorAll('.diary-delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number((btn as HTMLElement).getAttribute('data-entry-id') || '0');
        void this.deleteEntry(id);
      });
    });
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

    this.showMessage('Entry deleted', true);
    await this.loadEntries();
  }

  private showMessage(message: string, isSuccess: boolean): void {
    const messageElement = document.getElementById('diary-entries-message');
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
  const page = new DiaryEntriesPage();
  void page.initialize();
});
