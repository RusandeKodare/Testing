export class Dashboard {
  private token: string | null = null;
  private username: string | null = null;

  initialize(): void {
    this.token = localStorage.getItem('authToken');
    this.username = localStorage.getItem('username');

    if (!this.token || !this.username) {
      this.redirectToLogin();
      return;
    }

    this.loadUserInfo();
    this.setupEventListeners();
  }

  private loadUserInfo(): void {
    const usernameElements = document.querySelectorAll('#username, #username-detail');
    usernameElements.forEach(el => {
      if (el) el.textContent = this.username || 'User';
    });

    const loginTimeElement = document.getElementById('login-time');
    if (loginTimeElement) {
      loginTimeElement.textContent = new Date().toLocaleString();
    }
  }

  private setupEventListeners(): void {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  }

  private logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    this.redirectToLogin();
  }

  private redirectToLogin(): void {
    window.location.href = '/';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const dashboard = new Dashboard();
  dashboard.initialize();
});
