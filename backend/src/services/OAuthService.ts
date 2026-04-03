import { google } from 'googleapis';
import crypto from 'crypto';
import { UserRepository } from '../repositories/UserRepository';
import { User } from '../models/User';

export interface OAuthUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export class OAuthService {
  private oauth2Client;
  
  constructor(
    private userRepository: UserRepository,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  generateAuthUrl(state: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return this.oauth2Client.generateAuthUrl({
      scope: scopes,
      state: state,
    });
  }

  async handleCallback(code: string): Promise<{ user: User; isNewUser: boolean }> {
    // Exchange authorization code for tokens
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const userInfoResponse = await oauth2.userinfo.get();
    const userInfo = userInfoResponse.data;

    if (!userInfo.id || !userInfo.email) {
      throw new Error('Failed to get user info from Google');
    }

    // Find or create user
    const { user, isNewUser } = await this.findOrCreateUser({
      sub: userInfo.id,
      email: userInfo.email,
      name: userInfo.name || undefined,
      picture: userInfo.picture || undefined,
    });

    return { user, isNewUser };
  }

  private generateUniqueOAuthUsername(email: string): string {
    const localPart = email.split('@')[0] || 'user';
    const sanitized = localPart.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const base = (sanitized || 'user').slice(0, 24);

    if (!this.userRepository.userExists(base)) {
      return base;
    }

    for (let attempt = 1; attempt <= 1000; attempt += 1) {
      const candidate = `${base}-${attempt}`.slice(0, 32);
      if (!this.userRepository.userExists(candidate)) {
        return candidate;
      }
    }

    return `${base}-${crypto.randomBytes(3).toString('hex')}`.slice(0, 32);
  }

  private async findOrCreateUser(oauthInfo: OAuthUserInfo): Promise<{ user: User; isNewUser: boolean }> {
    // Try to find existing OAuth user
    let user = await this.userRepository.findByOAuth('google', oauthInfo.sub);

    if (user) {
      // Update profile picture if changed
      if (oauthInfo.picture && user.profilePicture !== oauthInfo.picture) {
        this.userRepository.updateProfilePicture(user.id!, oauthInfo.picture);
        user.profilePicture = oauthInfo.picture;
      }
      return { user, isNewUser: false };
    }

    // Create new OAuth user
    user = await this.userRepository.createOAuthUser({
      username: this.generateUniqueOAuthUsername(oauthInfo.email),
      email: oauthInfo.email,
      oauthProvider: 'google',
      oauthId: oauthInfo.sub,
      profilePicture: oauthInfo.picture || null,
    });

    return { user, isNewUser: true };
  }

  static generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
