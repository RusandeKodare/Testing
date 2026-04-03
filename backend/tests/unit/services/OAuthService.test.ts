import { describe, it, expect, jest } from '@jest/globals';
import { OAuthService } from '../../../src/services/OAuthService';

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
});
