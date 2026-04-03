import { Router, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository';
import { getLogger } from '../utils/logger';
import { AuthenticatedRequest, createAuthMiddleware } from '../middleware/authMiddleware';

const logger = getLogger('profile');

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]);

function isBase64Content(value: string): boolean {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function detectImageMimeType(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x39 || buffer[4] === 0x37) &&
    buffer[5] === 0x61
  ) {
    return 'image/gif';
  }

  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

function validateAndNormalizeProfileImage(profilePicture: string): { ok: true; normalized: string } | { ok: false; message: string } {
  const match = profilePicture.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return { ok: false, message: 'Invalid image format. Expected base64 data URL.' };
  }

  const mimeType = match[1].toLowerCase();
  const base64Content = match[2];

  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    return { ok: false, message: 'Invalid image format. Only JPEG, PNG, GIF, and WebP are allowed.' };
  }

  if (!isBase64Content(base64Content)) {
    return { ok: false, message: 'Invalid base64 image payload.' };
  }

  let decoded: Buffer;
  try {
    decoded = Buffer.from(base64Content, 'base64');
  } catch {
    return { ok: false, message: 'Image payload could not be decoded.' };
  }

  if (decoded.length === 0 || decoded.length > MAX_IMAGE_SIZE_BYTES) {
    return { ok: false, message: 'Image size exceeds 5MB limit' };
  }

  const detectedMimeType = detectImageMimeType(decoded);
  if (!detectedMimeType || detectedMimeType !== mimeType) {
    return { ok: false, message: 'Image file header mismatch' };
  }

  return {
    ok: true,
    normalized: `data:${mimeType};base64,${decoded.toString('base64')}`
  };
}

export function createProfileRoutes(userRepository: UserRepository, jwtSecret: string): Router {
  const router = Router();
  const authenticate = createAuthMiddleware(jwtSecret);

  router.use(authenticate);

  router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const user = userRepository.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email || null,
          profilePicture: user.profilePicture || null,
        }
      });
    } catch (error) {
      logger.error({ message: error instanceof Error ? error.message : String(error) }, 'Failed to fetch profile');
      res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
  });

  router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const user = userRepository.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.status(200).json({
        success: true,
        settings: {
          email: user.email || '',
          hasPassword: Boolean(user.passwordHash)
        }
      });
    } catch (error) {
      logger.error({ message: error instanceof Error ? error.message : String(error) }, 'Failed to fetch profile settings');
      res.status(500).json({ success: false, message: 'Failed to fetch profile settings' });
    }
  });

  router.put('/settings/email', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!email) {
        res.status(400).json({ success: false, message: 'Email is required' });
        return;
      }

      const emailRegex = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ success: false, message: 'Invalid email format' });
        return;
      }

      if (userRepository.emailExists(email, userId)) {
        res.status(409).json({ success: false, message: 'Email is already in use' });
        return;
      }

      userRepository.updateEmail(userId, email);

      logger.info({ userId }, 'Profile email updated');

      res.status(200).json({
        success: true,
        message: 'Email updated successfully',
        email
      });
    } catch (error) {
      logger.error({ message: error instanceof Error ? error.message : String(error) }, 'Failed to update profile email');
      res.status(500).json({ success: false, message: 'Failed to update profile email' });
    }
  });

  router.post('/settings/password', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
      const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
      const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!newPassword || !confirmPassword) {
        res.status(400).json({ success: false, message: 'New password and confirmation are required' });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({ success: false, message: 'Passwords do not match' });
        return;
      }

      const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!complexityRegex.test(newPassword)) {
        res.status(400).json({
          success: false,
          message: 'Password must be 8+ characters with uppercase, lowercase, number, and special character'
        });
        return;
      }

      const user = userRepository.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      if (user.passwordHash) {
        if (!currentPassword) {
          res.status(400).json({ success: false, message: 'Current password is required' });
          return;
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
          res.status(401).json({ success: false, message: 'Current password is incorrect' });
          return;
        }
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      userRepository.updatePasswordHash(userId, newPasswordHash);

      logger.info({ userId }, 'Profile password updated');

      res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      logger.error({ message: error instanceof Error ? error.message : String(error) }, 'Failed to update profile password');
      res.status(500).json({ success: false, message: 'Failed to update profile password' });
    }
  });

  // Upload/Update profile picture
  router.post('/picture', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { profilePicture } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!profilePicture) {
        res.status(400).json({ success: false, message: 'Profile picture data is required' });
        return;
      }

      const validation = validateAndNormalizeProfileImage(profilePicture);
      if (!validation.ok) {
        res.status(400).json({ success: false, message: validation.message });
        return;
      }

      userRepository.updateProfilePicture(userId, validation.normalized);

      logger.info({ userId }, 'Profile picture updated');

      res.status(200).json({
        success: true,
        message: 'Profile picture updated successfully'
      });
    } catch (error) {
      logger.error({ message: error instanceof Error ? error.message : String(error) }, 'Failed to update profile picture');
      res.status(500).json({ success: false, message: 'Failed to update profile picture' });
    }
  });

  // Get own profile picture
  router.get('/picture/me', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const profilePicture = userRepository.getProfilePicture(userId);

      if (!profilePicture) {
        res.status(404).json({ success: false, message: 'Profile picture not found' });
        return;
      }

      res.status(200).json({
        success: true,
        profilePicture
      });
    } catch (error) {
      logger.error({ message: error instanceof Error ? error.message : String(error) }, 'Failed to retrieve profile picture');
      res.status(500).json({ success: false, message: 'Failed to retrieve profile picture' });
    }
  });

  return router;
}
