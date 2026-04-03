import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username?: string;
    email?: string;
  };
}

export function createAuthMiddleware(jwtSecret: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const cookieToken = req.cookies?.authToken as string | undefined;
    const token = bearerToken || cookieToken;

    if (!token) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    try {
      const decodedWithAlg = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as {
        userId?: number;
        id?: number;
        username?: string;
        email?: string;
      };

      const userId = decodedWithAlg.userId ?? decodedWithAlg.id;
      if (!Number.isInteger(userId) || (userId as number) <= 0) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      req.user = {
        userId: userId as number,
        username: decodedWithAlg.username,
        email: decodedWithAlg.email
      };

      next();
    } catch {
      res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  };
}
