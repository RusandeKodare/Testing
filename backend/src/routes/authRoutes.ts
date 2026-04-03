import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { issueCsrfToken } from '../middleware/csrfMiddleware';

export function createAuthRoutes(authController: AuthController): Router {
  const router = Router();

  router.get('/csrf', (_req, res) => {
    const csrfToken = issueCsrfToken(res);
    res.status(200).json({ success: true, csrfToken });
  });

  router.post('/register', (req, res) => authController.register(req, res));
  router.post('/login', (req, res) => authController.login(req, res));
  router.post('/logout', (req, res) => authController.logout(req, res));

  return router;
}
