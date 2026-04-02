import { AuthService } from '../../../src/services/AuthService';
import { UserRepository } from '../../../src/repositories/UserRepository';

jest.mock('../../../src/repositories/UserRepository');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = new UserRepository(null as any) as jest.Mocked<UserRepository>;
    authService = new AuthService(mockUserRepository, 'test-secret', undefined);
  });

  describe('constructor', () => {
    it('should throw error when JWT secret is missing', () => {
      expect(() => {
        new AuthService(mockUserRepository, undefined, undefined);
      }).toThrow('JWT secret is required');
    });

    it('should throw error when JWT secret is empty', () => {
      expect(() => {
        new AuthService(mockUserRepository, '', undefined);
      }).toThrow('JWT secret is required');
    });

    it('should initialize successfully with valid JWT secret', () => {
      const service = new AuthService(mockUserRepository, 'valid-secret', undefined);
      expect(service).toBeDefined();
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      mockUserRepository.userExists.mockReturnValue(false);
      mockUserRepository.createUser.mockReturnValue({
        id: 1,
        username: 'testuser',
        passwordHash: 'hashedpassword',
        createdAt: new Date()
      });

      const result = await authService.register({
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123'
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Registration successful');
      expect(result.token).toBeDefined();
      expect(result.user).toEqual({ id: 1, username: 'testuser' });
    });

    it('should fail when username already exists', async () => {
      mockUserRepository.userExists.mockReturnValue(true);

      const result = await authService.register({
        username: 'existinguser',
        password: 'password123',
        confirmPassword: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Registration failed. Please try a different username.');
      expect(result.token).toBeUndefined();
    });

    it('should hash password before storing', async () => {
      mockUserRepository.userExists.mockReturnValue(false);
      mockUserRepository.createUser.mockReturnValue({
        id: 1,
        username: 'testuser',
        passwordHash: 'hashedpassword',
        createdAt: new Date()
      });

      await authService.register({
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123'
      });

      expect(mockUserRepository.createUser).toHaveBeenCalled();
      const hashedPassword = mockUserRepository.createUser.mock.calls[0][1];
      expect(hashedPassword).not.toBe('password123');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockUserRepository.findByUsername.mockReturnValue({
        id: 1,
        username: 'testuser',
        passwordHash: hashedPassword,
        createdAt: new Date()
      });

      const result = await authService.login({
        username: 'testuser',
        password: 'password123'
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successful');
      expect(result.token).toBeDefined();
      expect(result.user).toEqual({ id: 1, username: 'testuser' });
    });

    it('should fail when user does not exist', async () => {
      mockUserRepository.findByUsername.mockReturnValue(null);

      const result = await authService.login({
        username: 'nonexistent',
        password: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
      expect(result.token).toBeUndefined();
    });

    it('should fail when password is incorrect', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      mockUserRepository.findByUsername.mockReturnValue({
        id: 1,
        username: 'testuser',
        passwordHash: hashedPassword,
        createdAt: new Date()
      });

      const result = await authService.login({
        username: 'testuser',
        password: 'wrongpassword'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
      expect(result.token).toBeUndefined();
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      mockUserRepository.userExists.mockReturnValue(false);
      mockUserRepository.createUser.mockReturnValue({
        id: 1,
        username: 'testuser',
        passwordHash: 'hashedpassword',
        createdAt: new Date()
      });

      const registerResult = await authService.register({
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123'
      });

      const verified = authService.verifyToken(registerResult.token!);

      expect(verified).not.toBeNull();
      expect(verified?.id).toBe(1);
      expect(verified?.username).toBe('testuser');
    });

    it('should return null for invalid token', () => {
      const verified = authService.verifyToken('invalid-token');

      expect(verified).toBeNull();
    });

    it('should return null for expired token', () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign({ id: 1, username: 'test' }, 'test-secret', { expiresIn: '-1s' });

      const verified = authService.verifyToken(expiredToken);

      expect(verified).toBeNull();
    });
  });

  describe('account lockout', () => {
    it('should reject login when account is locked', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockUserRepository.findByUsername.mockReturnValue({
        id: 1,
        username: 'testuser',
        passwordHash: hashedPassword,
        createdAt: new Date(),
        loginAttempts: 5,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000) // Locked for 30 minutes
      });
      mockUserRepository.isAccountLocked.mockReturnValue(true);

      const result = await authService.login({
        username: 'testuser',
        password: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('locked');
      expect(mockUserRepository.incrementLoginAttempts).not.toHaveBeenCalled();
    });

    it('should increment login attempts on failed login', async () => {
      mockUserRepository.findByUsername.mockReturnValue({
        id: 1,
        username: 'testuser',
        passwordHash: 'hashedpassword',
        createdAt: new Date(),
        loginAttempts: 2
      });
      mockUserRepository.isAccountLocked.mockReturnValue(false);

      const result = await authService.login({
        username: 'testuser',
        password: 'wrongpassword'
      });

      expect(result.success).toBe(false);
      expect(mockUserRepository.incrementLoginAttempts).toHaveBeenCalledWith('testuser');
    });

    it('should lock account after 5 failed attempts', async () => {
      const userBefore = {
        id: 1,
        username: 'testuser',
        passwordHash: 'hashedpassword',
        createdAt: new Date(),
        loginAttempts: 4
      };
      
      const userAfter = {
        ...userBefore,
        loginAttempts: 5
      };
      
      // First call returns user with 4 attempts, second call (after increment) returns 5
      mockUserRepository.findByUsername
        .mockReturnValueOnce(userBefore)
        .mockReturnValueOnce(userAfter);
      mockUserRepository.isAccountLocked.mockReturnValue(false);

      const result = await authService.login({
        username: 'testuser',
        password: 'wrongpassword'
      });

      expect(result.success).toBe(false);
      expect(mockUserRepository.incrementLoginAttempts).toHaveBeenCalledWith('testuser');
      expect(mockUserRepository.lockAccount).toHaveBeenCalledWith('testuser', 30);
    });

    it('should reset login attempts on successful login', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockUserRepository.findByUsername.mockReturnValue({
        id: 1,
        username: 'testuser',
        passwordHash: hashedPassword,
        createdAt: new Date(),
        loginAttempts: 3
      });
      mockUserRepository.isAccountLocked.mockReturnValue(false);

      const result = await authService.login({
        username: 'testuser',
        password: 'password123'
      });

      expect(result.success).toBe(true);
      expect(mockUserRepository.resetLoginAttempts).toHaveBeenCalledWith('testuser');
    });

    it('should reject registration when passwords do not match', async () => {
      const result = await authService.register({
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'differentpassword'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Passwords do not match');
      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });

    it('should handle registration errors gracefully', async () => {
      mockUserRepository.userExists.mockReturnValue(false);
      mockUserRepository.createUser.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await authService.register({
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Registration failed. Please try again.');
      expect(result.token).toBeUndefined();
    });

    it('should handle login errors gracefully', async () => {
      mockUserRepository.findByUsername.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await authService.login({
        username: 'testuser',
        password: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Login failed. Please try again.');
      expect(result.token).toBeUndefined();
    });

    it('should reject registration with missing confirmPassword', async () => {
      const result = await authService.register({
        username: 'testuser',
        password: 'password123',
        confirmPassword: undefined as any
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Passwords do not match');
    });
  });
});
