import { Router, Request, Response } from 'express';

export function healthHandler(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString(),
  });
}

export function createHealthRoutes(): Router {
  const router = Router();
  router.get('/', healthHandler);
  return router;
}
