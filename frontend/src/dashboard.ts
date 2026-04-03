export class Dashboard {
  private token: string | null = null;
  private username: string | null = null;
  private userId: string | null = null;

  initialize(): void {
    this.token = localStorage.getItem('authToken');
    this.username = localStorage.getItem('username');
    this.userId = localStorage.getItem('userId');

    if (!this.token || !this.username || !this.userId) {
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

    // Load profile picture from database
    this.loadProfilePicture();
  }

  private async handleProfilePictureChange(e: Event): Promise<void> {
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

    // Convert to data URL
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      
      // Upload to backend
      try {
        const response = await fetch('http://localhost:3000/api/profile/picture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: this.userId,
            profilePicture: dataUrl,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Update all avatar images immediately
          const avatarImages = document.querySelectorAll('#profile-avatar, #profile-avatar-nav') as NodeListOf<HTMLImageElement>;
          avatarImages.forEach(img => {
            img.src = dataUrl;
          });
          alert('Profile picture updated successfully!');
        } else {
          alert('Failed to update profile picture: ' + result.message);
        }
      } catch (error) {
        console.error('Error uploading profile picture:', error);
        alert('Failed to upload profile picture. Please try again.');
      }
    };
    reader.readAsDataURL(file);
  }

  private async loadProfilePicture(): Promise<void> {
    try {
      const response = await fetch(`http://localhost:3000/api/profile/picture/${this.userId}`);
      const result = await response.json();

      if (result.success && result.profilePicture) {
        const avatarImages = document.querySelectorAll('#profile-avatar, #profile-avatar-nav') as NodeListOf<HTMLImageElement>;
        avatarImages.forEach(img => {
          img.src = result.profilePicture;
        });
      }
    } catch (error) {
      console.error('Error loading profile picture:', error);
      // Silently fail - user may not have a profile picture yet
    }
  }

  private showNotImplemented(): void {
    alert('NOT YET IMPLEMENTED');
  }

  private logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
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
