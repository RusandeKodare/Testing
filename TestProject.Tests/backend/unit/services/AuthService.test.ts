import { AuthService } from '../../../src/services/AuthService';
import { UserRepository } from '../../../src/repositories/UserRepository';
import { User } from '../../../src/models/User';

jest.mock('../../../src/repositories/UserRepository');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = new UserRepository(null as any) as jest.Mocked<UserRepository>;
    authService = new AuthService(mockUserRepository, 'test-secret');
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
        password: 'password123'
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
        password: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Username already exists');
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
        password: 'password123'
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
        password: 'password123'
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
});
