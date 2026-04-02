import { Request, Response } from 'express';
import * as winston from 'winston';
import { AuthService } from '../services/AuthService';
import { UserCredentials } from '../models/User';

export class AuthController {
  constructor(private authService: AuthService, private logger?: winston.Logger) {}

  private getCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 3600000 // 1 hour
    };
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const credentials: UserCredentials = {
        username: req.body.username,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword
      };

      if (!credentials.username || !credentials.password || !credentials.confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'Username, password, and password confirmation are required'
        });
        return;
      }

      const result = await this.authService.register(credentials);

      if (result.success && result.token) {
        // Set httpOnly cookie
        res.cookie('authToken', result.token, this.getCookieOptions());
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger?.error('Registration error', { error });
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

      if (result.success && result.token) {
        // Set httpOnly cookie
        res.cookie('authToken', result.token, this.getCookieOptions());
        res.status(200).json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      this.logger?.error('Login error', { error });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    try {
      // Clear the auth cookie
      const { maxAge, ...clearOptions } = this.getCookieOptions();
      res.clearCookie('authToken', clearOptions);
      
      this.logger?.info('User logged out successfully');
      
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      this.logger?.error('Logout error', { error });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
