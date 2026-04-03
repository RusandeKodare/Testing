import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Logger } from 'pino';
import { UserRepository } from '../repositories/UserRepository';
import { User, UserCredentials } from '../models/User';

export interface AuthResult {
  success: boolean;
  message: string;
  token?: string;
  user?: { id: number; username: string };
}

export class AuthService {
  private readonly saltRounds: number;
  private readonly jwtSecret: string;
  private readonly maxLoginAttempts = 5;
  private readonly lockoutDurationMinutes = 30;
  private readonly dummyHashForTiming = '$2a$10$4f.vjHzY5vJr9A0Qv8qAjOw8AxvP07xltN4D4wP4Vqp4R8h1hMnjS';

  constructor(
    private userRepository: UserRepository,
    jwtSecret?: string,
    private logger?: Logger
  ) {
    if (!jwtSecret) {
      throw new Error('JWT secret is required');
    }
    const configuredRounds = Number(process.env.BCRYPT_SALT_ROUNDS || '10');
    this.saltRounds = Number.isFinite(configuredRounds) && configuredRounds >= 10 ? Math.floor(configuredRounds) : 10;
    this.jwtSecret = jwtSecret;
  }

  async register(credentials: UserCredentials): Promise<AuthResult> {
    try {
      this.logger?.info({ username: credentials.username }, 'Starting registration process');

      if (!credentials.confirmPassword || credentials.password !== credentials.confirmPassword) {
        this.logger?.warn(
          { username: credentials.username },
          'Registration failed: passwords do not match'
        );
        return {
          success: false,
          message: 'Passwords do not match'
        };
      }

      this.logger?.debug({ username: credentials.username }, 'Password validation passed');

      if (this.userRepository.userExists(credentials.username)) {
        this.logger?.warn(
          { username: credentials.username },
          'Registration failed: username already exists'
        );
        return {
          success: false,
          message: 'Registration failed. Please try a different username.'
        };
      }

      this.logger?.debug({ username: credentials.username }, 'Username availability check passed');

      this.logger?.debug({ username: credentials.username }, 'Hashing password');
      const passwordHash = await bcrypt.hash(credentials.password, this.saltRounds);

      this.logger?.debug({ username: credentials.username }, 'Creating user in database');
      const user = this.userRepository.createUser(credentials.username, passwordHash);

      this.logger?.debug({ userId: user.id, username: user.username || credentials.username }, 'User created successfully, generating token');
      const token = this.generateToken(user);

      this.logger?.info(
        { userId: user.id, username: user.username || credentials.username },
        'User registered successfully'
      );

      return {
        success: true,
        message: 'Registration successful',
        token,
        user: { id: user.id!, username: user.username || credentials.username }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger?.error(
        { error: errorMessage, stack: process.env.NODE_ENV === 'production' ? undefined : errorStack, username: credentials.username },
        'Registration process failed with unexpected error'
      );
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }

  async login(credentials: UserCredentials): Promise<AuthResult> {
    try {
      this.logger?.info({ username: credentials.username }, 'Starting login process');

      const user = this.userRepository.findByUsername(credentials.username);

      if (!user) {
        await bcrypt.compare(credentials.password, this.dummyHashForTiming);
        this.logger?.warn(
          { username: credentials.username },
          'Login attempt with non-existent username'
        );
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      this.logger?.debug({ username: credentials.username }, 'User found in database');

      // Check if account is locked
      if (this.userRepository.isAccountLocked(user)) {
        this.logger?.warn(
          { userId: user.id, username: user.username || credentials.username },
          'Login attempt on locked account'
        );
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      this.logger?.debug({ username: credentials.username }, 'Comparing password');
      
      // Check if user has a password (not OAuth-only)
      if (!user.passwordHash) {
        this.logger?.warn({ username: credentials.username }, 'Password login attempted for OAuth-only account');
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }
      
      const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

      if (!isPasswordValid) {
        // Increment failed login attempts
        this.logger?.debug({ username: credentials.username }, 'Password invalid, incrementing failed attempts');
        this.userRepository.incrementLoginAttempts(credentials.username);
        const updatedUser = this.userRepository.findByUsername(credentials.username);

        if (updatedUser && updatedUser.loginAttempts! >= this.maxLoginAttempts) {
          this.logger?.debug({ username: credentials.username }, 'Max attempts reached, locking account');
          this.userRepository.lockAccount(credentials.username, this.lockoutDurationMinutes);
          this.logger?.error(
            { username: credentials.username, attempts: updatedUser.loginAttempts },
            'Account locked due to too many failed attempts'
          );
          return {
            success: false,
            message: 'Invalid credentials'
          };
        }

        this.logger?.warn(
          { username: credentials.username, attempts: (updatedUser?.loginAttempts || 0) },
          'Failed login attempt'
        );
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Reset login attempts on successful login
      this.logger?.debug({ username: credentials.username }, 'Password valid, resetting login attempts');
      this.userRepository.resetLoginAttempts(credentials.username);
      const token = this.generateToken(user);

      this.logger?.info(
        { userId: user.id, username: user.username || credentials.username },
        'User logged in successfully'
      );

      return {
        success: true,
        message: 'Login successful',
        token,
        user: { id: user.id!, username: user.username || credentials.username }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger?.error(
        { error: errorMessage, stack: process.env.NODE_ENV === 'production' ? undefined : errorStack, username: credentials.username },
        'Login process failed with unexpected error'
      );
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { id: user.id, username: user.username || user.email || 'user' },
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
