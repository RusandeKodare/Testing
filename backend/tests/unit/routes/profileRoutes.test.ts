import { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { createProfileRoutes } from '../../../src/routes/profileRoutes';
import { EmailNotificationService } from '../../../src/services/EmailNotificationService';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

type MockRepo = {
  findById: jest.Mock;
  emailExists: jest.Mock;
  updateEmail: jest.Mock;
  updatePasswordHash: jest.Mock;
  updateProfilePicture: jest.Mock;
  getProfilePicture: jest.Mock;
};

const mockRepo = (): MockRepo => ({
  findById: jest.fn().mockReturnValue({ id: 1, username: 'test-user', passwordHash: 'hash', email: 'test@example.com' }),
  emailExists: jest.fn(),
  updateEmail: jest.fn(),
  updatePasswordHash: jest.fn(),
  updateProfilePicture: jest.fn(),
  getProfilePicture: jest.fn()
});

const createRes = (): { res: Response; status: jest.Mock; json: jest.Mock } => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return {
    res: { status } as unknown as Response,
    status,
    json
  };
};

const getRouteHandler = (router: ReturnType<typeof createProfileRoutes>, path: string, method: 'get' | 'put' | 'post') => {
  const layer = (router as any).stack.find((entry: any) => entry.route?.path === path && entry.route?.methods?.[method]);
  if (!layer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }
  return layer.route.stack[0].handle;
};

describe('profileRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns profile settings for authenticated user', async () => {
    const repo = mockRepo();
    repo.findById.mockReturnValue({ id: 1, username: 'alice', passwordHash: 'hash', email: 'alice@example.com' });
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings', 'get');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 1 } }, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      settings: {
        email: 'alice@example.com',
        hasPassword: true
      }
    });
  });

  it('returns authenticated profile details for /me', async () => {
    const repo = mockRepo();
    repo.findById.mockReturnValue({ id: 11, username: 'carol', email: 'carol@example.com', profilePicture: null });
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/me', 'get');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 11 } }, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      user: {
        id: 11,
        username: 'carol',
        email: 'carol@example.com',
        profilePicture: null
      }
    });
  });

  it('returns unauthorized for /me when user is missing', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/me', 'get');
    const { res, status, json } = createRes();

    await handler({ user: undefined }, res);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized' });
  });

  it('returns not found for /me when user does not exist', async () => {
    const repo = mockRepo();
    repo.findById.mockReturnValue(null);
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/me', 'get');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 404 } }, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'User not found' });
  });

  it('returns unauthorized when settings are requested without user', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings', 'get');
    const { res, status, json } = createRes();

    await handler({ user: undefined }, res);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized' });
  });

  it('returns user-not-found when settings user does not exist', async () => {
    const repo = mockRepo();
    repo.findById.mockReturnValue(null);
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings', 'get');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 999 } }, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'User not found' });
  });

  it('rejects invalid email format', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings/email', 'put');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 1 }, body: { email: 'bad-email' } }, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Invalid email format' });
  });

  it('rejects empty email', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings/email', 'put');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 1 }, body: { email: '   ' } }, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Email is required' });
  });

  it('rejects email update when user is missing', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings/email', 'put');
    const { res, status, json } = createRes();

    await handler({ user: undefined, body: { email: 'user@example.com' } }, res);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized' });
  });

  it('rejects duplicate email', async () => {
    const repo = mockRepo();
    repo.findById.mockReturnValue({ id: 1, username: 'alice', email: 'alice@old.com' });
    repo.emailExists.mockReturnValue(true);
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings/email', 'put');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 1 }, body: { email: 'taken@example.com' } }, res);

    expect(repo.emailExists).toHaveBeenCalledWith('taken@example.com', 1);
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Email is already in use' });
  });

  it('rejects email update when user does not exist', async () => {
    const repo = mockRepo();
    repo.findById.mockReturnValue(null);
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings/email', 'put');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 77 }, body: { email: 'new@example.com' } }, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'User not found' });
  });

  it('updates email for valid request', async () => {
    const repo = mockRepo();
    repo.findById.mockReturnValue({ id: 7, username: 'alice', email: 'old@example.com' });
    repo.emailExists.mockReturnValue(false);
    const emailNotificationService: EmailNotificationService = {
      sendEmailChangeNotification: jest.fn().mockResolvedValue(undefined)
    };

    const router = createProfileRoutes(repo as unknown as any, 'secret', emailNotificationService);
    const handler = getRouteHandler(router, '/settings/email', 'put');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 7 }, body: { email: 'new@example.com' } }, res);

    expect(repo.updateEmail).toHaveBeenCalledWith(7, 'new@example.com');
    expect(emailNotificationService.sendEmailChangeNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        username: 'alice',
        previousEmail: 'old@example.com',
        newEmail: 'new@example.com'
      })
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      message: 'Email updated successfully',
      email: 'new@example.com'
    });
  });

  it('rejects password update when current password is wrong', async () => {
    const repo = mockRepo();
    repo.findById.mockReturnValue({ id: 1, username: 'alice', passwordHash: 'old-hash' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings/password', 'post');
    const { res, status, json } = createRes();

    await handler(
      {
        user: { userId: 1 },
        body: {
          currentPassword: 'wrong',
          newPassword: 'ValidPass1!',
          confirmPassword: 'ValidPass1!'
        }
      },
      res
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Current password is incorrect' });
  });

  it('updates password with valid payload', async () => {
    const repo = mockRepo();
    repo.findById.mockReturnValue({ id: 2, username: 'bob', passwordHash: 'old-hash' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings/password', 'post');
    const { res, status, json } = createRes();

    await handler(
      {
        user: { userId: 2 },
        body: {
          currentPassword: 'OldPass1!',
          newPassword: 'ValidPass1!',
          confirmPassword: 'ValidPass1!'
        }
      },
      res
    );

    expect(repo.updatePasswordHash).toHaveBeenCalledWith(2, 'new-hash');
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ success: true, message: 'Password updated successfully' });
  });

  it('rejects password update when new password is missing', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings/password', 'post');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 1 }, body: { newPassword: '', confirmPassword: '' } }, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'New password and confirmation are required' });
  });

  it('rejects password update when passwords do not match', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings/password', 'post');
    const { res, status, json } = createRes();

    await handler(
      { user: { userId: 1 }, body: { newPassword: 'ValidPass1!', confirmPassword: 'ValidPass1?' } },
      res
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Passwords do not match' });
  });

  it('rejects password update when complexity requirements are not met', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings/password', 'post');
    const { res, status, json } = createRes();

    await handler(
      { user: { userId: 1 }, body: { newPassword: 'simple', confirmPassword: 'simple' } },
      res
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Password must be 8+ characters with uppercase, lowercase, number, and special character'
    });
  });

  it('rejects password update when user requires current password but it is missing', async () => {
    const repo = mockRepo();
    repo.findById.mockReturnValue({ id: 1, username: 'alice', passwordHash: 'old-hash' });
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings/password', 'post');
    const { res, status, json } = createRes();

    await handler(
      {
        user: { userId: 1 },
        body: {
          currentPassword: '',
          newPassword: 'ValidPass1!',
          confirmPassword: 'ValidPass1!'
        }
      },
      res
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Current password is required' });
  });

  it('returns not found when user does not exist during password update', async () => {
    const repo = mockRepo();
    repo.findById.mockReturnValue(null);
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings/password', 'post');
    const { res, status, json } = createRes();

    await handler(
      {
        user: { userId: 1 },
        body: {
          currentPassword: 'OldPass1!',
          newPassword: 'ValidPass1!',
          confirmPassword: 'ValidPass1!'
        }
      },
      res
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'User not found' });
  });

  it('rejects password update for OAuth-only accounts', async () => {
    const repo = mockRepo();
    repo.findById.mockReturnValue({ id: 3, username: 'oauth-user', passwordHash: null });
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/settings/password', 'post');
    const { res, status, json } = createRes();

    await handler(
      {
        user: { userId: 3 },
        body: {
          currentPassword: '',
          newPassword: 'ValidPass1!',
          confirmPassword: 'ValidPass1!'
        }
      },
      res
    );

    expect(repo.updatePasswordHash).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Password update is not available for OAuth-only accounts' });
  });

  it('returns not found when profile picture upload user does not exist', async () => {
    const repo = mockRepo();
    repo.findById.mockReturnValue(null);
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture', 'post');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 5 }, body: { profilePicture: 'data:image/png;base64,AA==' } }, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'User not found' });
  });

  it('returns not found when profile picture read user does not exist', async () => {
    const repo = mockRepo();
    repo.findById.mockReturnValue(null);
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture/me', 'get');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 5 } }, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'User not found' });
  });

  it('updates profile picture for valid image payload', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture', 'post');
    const { res, status, json } = createRes();
    const picture = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6p7S8AAAAASUVORK5CYII=';

    await handler({ user: { userId: 5 }, body: { profilePicture: picture } }, res);

    expect(repo.updateProfilePicture).toHaveBeenCalledWith(5, picture);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      message: 'Profile picture updated successfully'
    });
  });

  it('rejects invalid picture format', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture', 'post');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 5 }, body: { profilePicture: 'not-a-data-url' } }, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Invalid image format. Expected base64 data URL.' });
  });

  it('rejects unauthorized profile picture upload', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture', 'post');
    const { res, status, json } = createRes();

    await handler({ user: undefined, body: { profilePicture: 'data:image/png;base64,AA==' } }, res);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized' });
  });

  it('rejects missing profile picture payload', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture', 'post');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 2 }, body: {} }, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Profile picture data is required' });
  });

  it('rejects disallowed image mime types like svg', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture', 'post');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 2 }, body: { profilePicture: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' } }, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid image format. Only JPEG, PNG, GIF, and WebP are allowed.'
    });
  });

  it('rejects invalid base64 payload characters', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture', 'post');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 2 }, body: { profilePicture: 'data:image/png;base64,ABC*123' } }, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Invalid image format. Expected base64 data URL.' });
  });

  it('rejects image header mismatch', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture', 'post');
    const { res, status, json } = createRes();
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString('base64');

    await handler({ user: { userId: 2 }, body: { profilePicture: `data:image/png;base64,${jpegHeader}` } }, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Image file header mismatch' });
  });

  it('accepts minimal valid JPEG payload', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture', 'post');
    const { res, status } = createRes();
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString('base64');

    await handler({ user: { userId: 3 }, body: { profilePicture: `data:image/jpeg;base64,${jpegHeader}` } }, res);

    expect(repo.updateProfilePicture).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
  });

  it('accepts minimal valid GIF payload', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture', 'post');
    const { res, status } = createRes();
    const gifHeader = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]).toString('base64');

    await handler({ user: { userId: 4 }, body: { profilePicture: `data:image/gif;base64,${gifHeader}` } }, res);

    expect(repo.updateProfilePicture).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
  });

  it('accepts minimal valid WebP payload', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture', 'post');
    const { res, status } = createRes();
    const webpHeader = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]).toString('base64');

    await handler({ user: { userId: 6 }, body: { profilePicture: `data:image/webp;base64,${webpHeader}` } }, res);

    expect(repo.updateProfilePicture).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
  });

  it('rejects too-large picture payload', async () => {
    const repo = mockRepo();
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture', 'post');
    const { res, status, json } = createRes();
    const oversized = 'data:image/png;base64,' + 'a'.repeat(8 * 1024 * 1024);

    await handler({ user: { userId: 5 }, body: { profilePicture: oversized } }, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Image size exceeds 5MB limit' });
  });

  it('returns 404 when profile picture is missing', async () => {
    const repo = mockRepo();
    repo.getProfilePicture.mockReturnValue(null);
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture/me', 'get');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 5 } }, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Profile picture not found' });
  });

  it('returns profile picture when available', async () => {
    const repo = mockRepo();
    repo.getProfilePicture.mockReturnValue('data:image/png;base64,abc123');
    const router = createProfileRoutes(repo as unknown as any, 'secret');
    const handler = getRouteHandler(router, '/picture/me', 'get');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 5 } }, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      profilePicture: 'data:image/png;base64,abc123'
    });
  });
});