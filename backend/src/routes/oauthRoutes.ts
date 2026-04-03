import { Router, Request, Response } from 'express';
import { OAuthService } from '../services/OAuthService';
import jwt from 'jsonwebtoken';
import { getLogger } from '../utils/logger';

const logger = getLogger('oauth');

export function createOAuthRoutes(
  oauthService: OAuthService,
  jwtSecret: string
): Router {
  const router = Router();

  // Initiate Google OAuth flow
  router.get('/google/login', (_req: Request, res: Response) => {
    try {
      const state = OAuthService.generateState();
      
      // In production, store state in session or Redis
      // For now, we'll pass it in the URL
      const authUrl = oauthService.generateAuthUrl(state);

      res.json({
        success: true,
        authUrl,
        state,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to generate OAuth URL');
      res.status(500).json({
        success: false,
        message: 'Failed to initiate OAuth flow',
      });
    }
  });

  // Handle Google OAuth callback
  router.get('/google/callback', async (req: Request, res: Response) => {
    try {
      const { code } = req.query;
      // Note: state parameter validation should be added for production CSRF protection

      if (!code || typeof code !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Authorization code is required',
        });
        return;
      }

      const { user, isNewUser } = await oauthService.handleCallback(code);

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username, email: user.email },
        jwtSecret,
        { expiresIn: '1h' }
      );

      logger.info(
        { userId: user.id, email: user.email, isNewUser },
        'OAuth login successful'
      );

      // Set httpOnly cookie
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000,
      });

      // Return user info and token
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture,
        },
        isNewUser,
      });
    } catch (error) {
      logger.error({ error }, 'OAuth callback failed');
      res.status(500).json({
        success: false,
        message: 'OAuth authentication failed',
      });
    }
  });

  return router;
}
