import { Router, Response } from 'express';
import { UserRepository } from '../repositories/UserRepository';
import { getLogger } from '../utils/logger';
import { AuthenticatedRequest, createAuthMiddleware } from '../middleware/authMiddleware';

const logger = getLogger('profile');

export function createProfileRoutes(userRepository: UserRepository, jwtSecret: string): Router {
  const router = Router();
  const authenticate = createAuthMiddleware(jwtSecret);

  router.use(authenticate);

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

      // Validate it's a data URL
      if (!profilePicture.startsWith('data:image/')) {
        res.status(400).json({ success: false, message: 'Invalid image format' });
        return;
      }

      // Check file size (approx 5MB limit for base64)
      const sizeInBytes = (profilePicture.length * 3) / 4;
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (sizeInBytes > maxSize) {
        res.status(400).json({ success: false, message: 'Image size exceeds 5MB limit' });
        return;
      }

      userRepository.updateProfilePicture(userId, profilePicture);

      logger.info({ userId }, 'Profile picture updated');

      res.status(200).json({
        success: true,
        message: 'Profile picture updated successfully'
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update profile picture');
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
      logger.error({ error }, 'Failed to retrieve profile picture');
      res.status(500).json({ success: false, message: 'Failed to retrieve profile picture' });
    }
  });

  return router;
}
