import { describe, it, expect, jest } from '@jest/globals';
import { OAuthService } from '../../../src/services/OAuthService';
import { google } from 'googleapis';

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest.fn().mockReturnValue('https://oauth.test/auth'),
        getToken: jest.fn(),
        setCredentials: jest.fn()
      }))
    },
    oauth2: jest.fn()
  }
}));

describe('OAuthService', () => {
  const createRepo = () => ({
    findByOAuth: jest.fn(),
    updateProfilePicture: jest.fn(),
    createOAuthUser: jest.fn(),
    userExists: jest.fn()
  });

  it('generates unique OAuth username when local-part already exists', async () => {
    const repo = createRepo();
    repo.findByOAuth.mockReturnValue(Promise.resolve(null));
    repo.userExists
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    repo.createOAuthUser.mockReturnValue({
      id: 3,
      username: 'john-1',
      email: 'john@example.com',
      oauthProvider: 'google',
      oauthId: 'oauth-123'
    });

    const service = new OAuthService(repo as any, 'client', 'secret', 'redirect');
    const result = await (service as any).findOrCreateUser({
      sub: 'oauth-123',
      email: 'john@example.com',
      picture: null
    });

    expect(repo.createOAuthUser).toHaveBeenCalledWith(expect.objectContaining({ username: 'john-1' }));
    expect(result.isNewUser).toBe(true);
  });

  it('uses sanitized fallback username when email local-part is empty after sanitization', async () => {
    const repo = createRepo();
    repo.findByOAuth.mockReturnValue(Promise.resolve(null));
    repo.userExists.mockReturnValue(false);
    repo.createOAuthUser.mockReturnValue({
      id: 4,
      username: 'user',
      email: '@example.com',
      oauthProvider: 'google',
      oauthId: 'oauth-124'
    });

    const service = new OAuthService(repo as any, 'client', 'secret', 'redirect');
    await (service as any).findOrCreateUser({
      sub: 'oauth-124',
      email: '@example.com',
      picture: null
    });

    expect(repo.createOAuthUser).toHaveBeenCalledWith(expect.objectContaining({ username: 'user' }));
  });

  it('generates auth URL with expected OAuth state and scopes', () => {
    const repo = createRepo();
    const service = new OAuthService(repo as any, 'client', 'secret', 'redirect');
    const client = (service as any).oauth2Client;

    client.generateAuthUrl.mockReturnValue('https://oauth.test/auth-url');
    const url = service.generateAuthUrl('state-123');

    expect(client.generateAuthUrl).toHaveBeenCalledWith({
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: 'state-123'
    });
    expect(url).toBe('https://oauth.test/auth-url');
  });

  it('returns existing OAuth user without creating a new one', async () => {
    const repo = createRepo();
    const existingUser = {
      id: 7,
      username: 'existing',
      email: 'existing@example.com',
      oauthProvider: 'google',
      oauthId: 'oauth-existing',
      profilePicture: 'https://img.example.com/pic-a.png'
    };

    repo.findByOAuth.mockReturnValue(Promise.resolve(existingUser));
    const service = new OAuthService(repo as any, 'client', 'secret', 'redirect');

    const result = await (service as any).findOrCreateUser({
      sub: 'oauth-existing',
      email: 'existing@example.com',
      picture: 'https://img.example.com/pic-a.png'
    });

    expect(result).toEqual({ user: existingUser, isNewUser: false });
    expect(repo.updateProfilePicture).not.toHaveBeenCalled();
    expect(repo.createOAuthUser).not.toHaveBeenCalled();
  });

  it('updates profile picture for existing OAuth user when picture changes', async () => {
    const repo = createRepo();
    const existingUser = {
      id: 9,
      username: 'existing',
      email: 'existing@example.com',
      oauthProvider: 'google',
      oauthId: 'oauth-existing',
      profilePicture: 'https://img.example.com/old.png'
    };

    repo.findByOAuth.mockReturnValue(Promise.resolve(existingUser));

    const service = new OAuthService(repo as any, 'client', 'secret', 'redirect');
    const result = await (service as any).findOrCreateUser({
      sub: 'oauth-existing',
      email: 'existing@example.com',
      picture: 'https://img.example.com/new.png'
    });

    expect(repo.updateProfilePicture).toHaveBeenCalledWith(9, 'https://img.example.com/new.png');
    expect(result.user.profilePicture).toBe('https://img.example.com/new.png');
    expect(result.isNewUser).toBe(false);
  });

  it('handles callback and creates new OAuth user from Google profile', async () => {
    const repo = createRepo();
    repo.findByOAuth.mockReturnValue(Promise.resolve(null));
    repo.userExists.mockReturnValue(false);
    repo.createOAuthUser.mockReturnValue(Promise.resolve({
      id: 11,
      username: 'newuser',
      email: 'newuser@example.com',
      oauthProvider: 'google',
      oauthId: 'oauth-new',
      profilePicture: 'https://img.example.com/new-user.png'
    }));

    const service = new OAuthService(repo as any, 'client', 'secret', 'redirect');
    const client = (service as any).oauth2Client;
    client.getToken.mockReturnValue(Promise.resolve({ tokens: { access_token: 'access-token' } }));

    const oauth2Factory = google.oauth2 as unknown as jest.Mock;
    const userInfoGet = jest.fn().mockReturnValue(Promise.resolve({
      data: {
        id: 'oauth-new',
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://img.example.com/new-user.png'
      }
    }));
    oauth2Factory.mockReturnValue({ userinfo: { get: userInfoGet } });

    const result = await service.handleCallback('auth-code');

    expect(client.getToken).toHaveBeenCalledWith('auth-code');
    expect(client.setCredentials).toHaveBeenCalledWith({ access_token: 'access-token' });
    expect(repo.createOAuthUser).toHaveBeenCalledWith(expect.objectContaining({
      email: 'newuser@example.com',
      oauthId: 'oauth-new'
    }));
    expect(result.isNewUser).toBe(true);
    expect(result.user.id).toBe(11);
  });

  it('rejects callback when Google user info is missing required fields', async () => {
    const repo = createRepo();
    const service = new OAuthService(repo as any, 'client', 'secret', 'redirect');
    const client = (service as any).oauth2Client;

    client.getToken.mockReturnValue(Promise.resolve({ tokens: { access_token: 'token' } }));

    const oauth2Factory = google.oauth2 as unknown as jest.Mock;
    const userInfoGet = jest.fn().mockReturnValue(Promise.resolve({ data: { id: 'oauth-id' } }));
    oauth2Factory.mockReturnValue({ userinfo: { get: userInfoGet } });

    await expect(service.handleCallback('auth-code')).rejects.toThrow('Failed to get user info from Google');
    expect(repo.createOAuthUser).not.toHaveBeenCalled();
  });

  it('generates a cryptographically random state token', () => {
    const state = OAuthService.generateState();

    expect(typeof state).toBe('string');
    expect(state).toMatch(/^[a-f0-9]{64}$/);
  });
});
