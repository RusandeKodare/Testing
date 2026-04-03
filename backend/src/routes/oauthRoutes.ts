import { Router, Request, Response } from 'express';
import { OAuthService } from '../services/OAuthService';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getLogger } from '../utils/logger';

const logger = getLogger('oauth');

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type OAuthStateEntry = {
  binding: string;
  expiresAt: number;
};

const oauthStateStore = new Map<string, OAuthStateEntry>();

function pruneExpiredStates(): void {
  const now = Date.now();
  for (const [state, entry] of oauthStateStore.entries()) {
    if (entry.expiresAt <= now) {
      oauthStateStore.delete(state);
    }
  }
}

function createRequestBinding(req: Request): string {
  const userAgent = req.headers['user-agent'] || 'unknown';
  return crypto.createHash('sha256').update(String(userAgent)).digest('hex');
}

export function createOAuthRoutes(
  oauthService: OAuthService,
  jwtSecret: string
): Router {
  const router = Router();

  // Initiate Google OAuth flow
  router.get('/google/login', (req: Request, res: Response) => {
    try {
      const state = OAuthService.generateState();
      const binding = createRequestBinding(req);
      pruneExpiredStates();
      oauthStateStore.set(state, {
        binding,
        expiresAt: Date.now() + OAUTH_STATE_TTL_MS
      });

      // Store state server-side for callback validation.
      res.cookie('oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: OAUTH_STATE_TTL_MS,
      });
      res.cookie('oauth_state_binding', binding, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: OAUTH_STATE_TTL_MS,
      });

      const authUrl = oauthService.generateAuthUrl(state);

      res.json({
        success: true,
        authUrl,
      });
    } catch (error) {
      logger.error({ message: error instanceof Error ? error.message : String(error) }, 'Failed to generate OAuth URL');
      res.status(500).json({
        success: false,
        message: 'Failed to initiate OAuth flow',
      });
    }
  });

  // Handle Google OAuth callback
  router.get('/google/callback', async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;

      if (!code || typeof code !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Authorization code is required',
        });
        return;
      }

      if (!state || typeof state !== 'string') {
        res.status(400).json({
          success: false,
          message: 'OAuth state is required',
        });
        return;
      }

      const expectedState = req.cookies?.oauth_state as string | undefined;
      const expectedBinding = req.cookies?.oauth_state_binding as string | undefined;
      const currentBinding = createRequestBinding(req);
      pruneExpiredStates();
      const storedState = oauthStateStore.get(state);
      const stateIsValid = Boolean(storedState) && (storedState as OAuthStateEntry).expiresAt > Date.now();

      if (
        !expectedState ||
        expectedState !== state ||
        !expectedBinding ||
        expectedBinding !== currentBinding ||
        !stateIsValid ||
        storedState?.binding !== currentBinding
      ) {
        oauthStateStore.delete(state);
        res.status(400).json({
          success: false,
          message: 'Invalid OAuth state',
        });
        return;
      }

      oauthStateStore.delete(state);

      res.clearCookie('oauth_state');
      res.clearCookie('oauth_state_binding');

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
      logger.error({ message: error instanceof Error ? error.message : String(error) }, 'OAuth callback failed');
      res.status(500).json({
        success: false,
        message: 'OAuth authentication failed',
      });
    }
  });

  return router;
}
