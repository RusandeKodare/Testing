import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
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

  constructor(private userRepository: UserRepository, jwtSecret?: string) {
    if (!jwtSecret) {
      throw new Error('JWT secret is required');
    }
    this.jwtSecret = jwtSecret;
  }

  async register(credentials: UserCredentials): Promise<AuthResult> {
    if (this.userRepository.userExists(credentials.username)) {
      return {
        success: false,
        message: 'Registration failed. Please try a different username.'
      };
    }

    const passwordHash = await bcrypt.hash(credentials.password, this.saltRounds);
    const user = this.userRepository.createUser(credentials.username, passwordHash);

    const token = this.generateToken(user);

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
      return {
        success: false,
        message: 'Invalid credentials'
      };
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid credentials'
      };
    }

    const token = this.generateToken(user);

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
