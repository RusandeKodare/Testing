import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { UserCredentials } from '../models/User';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(req: Request, res: Response): Promise<void> {
    try {
      const credentials: UserCredentials = {
        username: req.body.username,
        password: req.body.password
      };

      if (!credentials.username || !credentials.password) {
        res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
        return;
      }

      const result = await this.authService.register(credentials);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const credentials: UserCredentials = {
        username: req.body.username,
        password: req.body.password
      };

      if (!credentials.username || !credentials.password) {
        res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
        return;
      }

      const result = await this.authService.login(credentials);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
