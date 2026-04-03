import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrfToken';

function getCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 1000,
    path: '/'
  };
}

export function issueCsrfToken(res: Response): string {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions());
  return token;
}

export function createCsrfProtection(ignorePaths: string[] = []) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      next();
      return;
    }

    if (ignorePaths.includes(req.path)) {
      next();
      return;
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
    const headerToken = (req.headers['x-csrf-token'] as string | undefined) || '';

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      res.status(403).json({ success: false, message: 'CSRF validation failed' });
      return;
    }

    next();
  };
}
