import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as winston from 'winston';
import { UserRepository } from '../repositories/UserRepository';
import { User, UserCredentials } from '../models/User';

export interface AuthResult {
  success: boolean;
  message: string;
  token?: string;
  user?: { id: number; username: string };
}

export class AuthService {
  private readonly saltRounds = 10;
  private readonly jwtSecret: string;
  private readonly maxLoginAttempts = 5;
  private readonly lockoutDurationMinutes = 30;

  constructor(
    private userRepository: UserRepository,
    jwtSecret?: string,
    private logger?: winston.Logger
  ) {
    if (!jwtSecret) {
      throw new Error('JWT secret is required');
    }
    this.jwtSecret = jwtSecret;
  }

  async register(credentials: UserCredentials): Promise<AuthResult> {
    if (!credentials.confirmPassword || credentials.password !== credentials.confirmPassword) {
      this.logger?.warn('Registration failed: passwords do not match', {
        username: credentials.username
      });
      return {
        success: false,
        message: 'Passwords do not match'
      };
    }

    if (this.userRepository.userExists(credentials.username)) {
      this.logger?.warn('Registration failed: username already exists', {
        username: credentials.username
      });
      return {
        success: false,
        message: 'Registration failed. Please try a different username.'
      };
    }

    const passwordHash = await bcrypt.hash(credentials.password, this.saltRounds);
    const user = this.userRepository.createUser(credentials.username, passwordHash);

    const token = this.generateToken(user);

    this.logger?.info('User registered successfully', {
      userId: user.id,
      username: user.username
    });

    return {
      success: true,
      message: 'Registration successful',
      token,
      user: { id: user.id!, username: user.username }
    };
  }

  async login(credentials: UserCredentials): Promise<AuthResult> {
    const user = this.userRepository.findByUsername(credentials.username);

    if (!user) {
      this.logger?.warn('Login attempt with non-existent username', {
        username: credentials.username
      });
      return {
        success: false,
        message: 'Invalid credentials'
      };
    }

    // Check if account is locked
    if (this.userRepository.isAccountLocked(user)) {
      this.logger?.warn('Login attempt on locked account', {
        userId: user.id,
        username: user.username
      });
      return {
        success: false,
        message: 'Account is temporarily locked. Please try again later.'
      };
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      this.userRepository.incrementLoginAttempts(credentials.username);
      const updatedUser = this.userRepository.findByUsername(credentials.username);

      if (updatedUser && updatedUser.loginAttempts! >= this.maxLoginAttempts) {
        this.userRepository.lockAccount(credentials.username, this.lockoutDurationMinutes);
        this.logger?.error('Account locked due to too many failed attempts', {
          username: credentials.username,
          attempts: updatedUser.loginAttempts
        });
        return {
          success: false,
          message: 'Too many failed login attempts. Account locked for 30 minutes.'
        };
      }

      this.logger?.warn('Failed login attempt', {
        username: credentials.username,
        attempts: (updatedUser?.loginAttempts || 0) + 1
      });
      return {
        success: false,
        message: 'Invalid credentials'
      };
    }

    // Reset login attempts on successful login
    this.userRepository.resetLoginAttempts(credentials.username);
    const token = this.generateToken(user);

    this.logger?.info('User logged in successfully', {
      userId: user.id,
      username: user.username
    });

    return {
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id!, username: user.username }
    };
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { id: user.id, username: user.username },
      this.jwtSecret,
      { expiresIn: '1h' }
    );
  }

  verifyToken(token: string): { id: number; username: string } | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { id: number; username: string };
      return decoded;
    } catch {
      return null;
    }
  }
}
