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
    // Update username in all locations
    const usernameElements = document.querySelectorAll('#username, #username-detail, #username-hero, #username-nav');
    usernameElements.forEach(el => {
      if (el) el.textContent = this.username || 'User';
    });

    // Update login time
    const loginTimeElement = document.getElementById('login-time');
    if (loginTimeElement) {
      loginTimeElement.textContent = new Date().toLocaleString();
    }
  }

  private setupEventListeners(): void {
    // Handle logout from both buttons
    const logoutButtons = document.querySelectorAll('#logout-btn, .logout-btn-nav');
    logoutButtons.forEach(btn => {
      btn.addEventListener('click', () => this.logout());
    });

    // Handle click on action buttons
    const actionButtons = document.querySelectorAll('.action-btn-large');
    actionButtons.forEach(btn => {
      btn.addEventListener('click', () => this.showNotImplemented());
    });

    // Handle profile avatar change in hero section
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

    // Load saved profile picture
    this.loadProfilePicture();
  }

  private handleProfilePictureChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Convert to data URL and save
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      localStorage.setItem('profilePicture', dataUrl);
      
      // Update all avatar images
      const avatarImages = document.querySelectorAll('#profile-avatar, #profile-avatar-nav') as NodeListOf<HTMLImageElement>;
      avatarImages.forEach(img => {
        img.src = dataUrl;
      });
    };
    reader.readAsDataURL(file);
  }

  private loadProfilePicture(): void {
    const savedPicture = localStorage.getItem('profilePicture');
    if (savedPicture) {
      const avatarImages = document.querySelectorAll('#profile-avatar, #profile-avatar-nav') as NodeListOf<HTMLImageElement>;
      avatarImages.forEach(img => {
        img.src = savedPicture;
      });
    }
  }

  private showNotImplemented(): void {
    alert('NOT YET IMPLEMENTED');
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
