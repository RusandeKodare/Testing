import { Request, Response } from 'express';
import { Logger } from 'pino';
import { AuthService } from '../services/AuthService';
import { UserCredentials } from '../models/User';

export class AuthController {
  constructor(private authService: AuthService, private logger?: Logger) {}

  private getCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 3600000 // 1 hour
    };
  }

  async register(req: Request, res: Response): Promise<void> {
    this.logger?.info({ url: req.url, method: req.method }, 'Registration request received');
    
    try {
      const credentials: UserCredentials = {
        username: req.body.username,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword
      };

      this.logger?.debug({ username: credentials.username }, 'Registration credentials validated');

      if (!credentials.username || !credentials.password || !credentials.confirmPassword) {
        this.logger?.warn({ username: credentials.username }, 'Registration validation failed: missing fields');
        res.status(400).json({
          success: false,
          message: 'Username, password, and password confirmation are required'
        });
        return;
      }

      this.logger?.info({ username: credentials.username }, 'Calling registration service');
      const result = await this.authService.register(credentials);

      if (result.success && result.token) {
        this.logger?.info({ userId: result.user?.id, username: result.user?.username }, 'Registration successful');
        // Set httpOnly cookie
        res.cookie('authToken', result.token, this.getCookieOptions());
        res.status(201).json(result);
      } else {
        this.logger?.warn({ username: credentials.username, message: result.message }, 'Registration failed');
        res.status(400).json(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger?.error(
        { error: errorMessage, stack: errorStack, username: req.body.username },
        'Registration error - unexpected exception'
      );
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    this.logger?.info({ url: req.url }, 'Login request received');
    
    try {
      const credentials: UserCredentials = {
        username: req.body.username,
        password: req.body.password
      };

      this.logger?.debug({ username: credentials.username }, 'Login credentials validated');

      if (!credentials.username || !credentials.password) {
        this.logger?.warn({ username: credentials.username }, 'Login validation failed: missing fields');
        res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
        return;
      }

      this.logger?.info({ username: credentials.username }, 'Calling login service');
      const result = await this.authService.login(credentials);

      if (result.success && result.token) {
        this.logger?.info({ userId: result.user?.id, username: result.user?.username }, 'Login successful');
        // Set httpOnly cookie
        res.cookie('authToken', result.token, this.getCookieOptions());
        res.status(200).json(result);
      } else {
        this.logger?.warn({ username: credentials.username, message: result.message }, 'Login failed');
        res.status(401).json(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger?.error(
        { error: errorMessage, stack: errorStack, username: req.body.username },
        'Login error - unexpected exception'
      );
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    this.logger?.info('Logout request received');
    
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger?.error({ error: errorMessage }, 'Logout error - unexpected exception');
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
