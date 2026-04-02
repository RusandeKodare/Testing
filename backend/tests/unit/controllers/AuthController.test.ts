import { AuthController } from '../../../src/controllers/AuthController';
import { AuthService } from '../../../src/services/AuthService';
import { Request, Response } from 'express';

jest.mock('../../../src/services/AuthService');

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockAuthService = new AuthService(null as any, 'test-secret', undefined) as jest.Mocked<AuthService>;
    authController = new AuthController(mockAuthService, undefined);

    jsonMock = jest.fn().mockReturnValue({});
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const cookieMock = jest.fn().mockReturnValue({});

    mockRequest = {
      body: {}
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
      cookie: cookieMock
    };
  });

  describe('register', () => {
    it('should return 201 on successful registration', async () => {
      mockRequest.body = { username: 'testuser', password: 'password123', confirmPassword: 'password123' };
      mockAuthService.register.mockResolvedValue({
        success: true,
        message: 'Registration successful',
        token: 'token123',
        user: { id: 1, username: 'testuser' }
      });

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Registration successful'
      }));
      expect(mockResponse.cookie).toHaveBeenCalledWith('authToken', 'token123', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 3600000
      });
    });

    it('should return 400 when username is missing', async () => {
      mockRequest.body = { password: 'password123', confirmPassword: 'password123' };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Username, password, and password confirmation are required'
      });
    });

    it('should return 400 when password is missing', async () => {
      mockRequest.body = { username: 'testuser', confirmPassword: 'password123' };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Username, password, and password confirmation are required'
      });
    });

    it('should return 400 when username already exists', async () => {
      mockRequest.body = { username: 'existinguser', password: 'password123', confirmPassword: 'password123' };
      mockAuthService.register.mockResolvedValue({
        success: false,
        message: 'Username already exists'
      });

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Username already exists'
      });
    });

    it('should return 500 on internal error', async () => {
      mockRequest.body = { username: 'testuser', password: 'password123', confirmPassword: 'password123' };
      mockAuthService.register.mockRejectedValue(new Error('Database error'));

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  describe('login', () => {
    it('should return 200 on successful login', async () => {
      mockRequest.body = { username: 'testuser', password: 'password123' };
      mockAuthService.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
        token: 'token123',
        user: { id: 1, username: 'testuser' }
      });

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Login successful'
      }));
      expect(mockResponse.cookie).toHaveBeenCalledWith('authToken', 'token123', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 3600000
      });
    });

    it('should return 400 when username is missing', async () => {
      mockRequest.body = { password: 'password123' };

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Username and password are required'
      });
    });

    it('should return 400 when password is missing', async () => {
      mockRequest.body = { username: 'testuser' };

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Username and password are required'
      });
    });

    it('should return 401 on invalid credentials', async () => {
      mockRequest.body = { username: 'testuser', password: 'wrongpassword' };
      mockAuthService.login.mockResolvedValue({
        success: false,
        message: 'Invalid credentials'
      });

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });

    it('should return 500 on internal error', async () => {
      mockRequest.body = { username: 'testuser', password: 'password123' };
      mockAuthService.login.mockRejectedValue(new Error('Database error'));

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  describe('logout', () => {
    it('should clear auth cookie and return success', async () => {
      const clearCookieMock = jest.fn();
      mockResponse.clearCookie = clearCookieMock;

      await authController.logout(mockRequest as Request, mockResponse as Response);

      expect(clearCookieMock).toHaveBeenCalledWith('authToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict'
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully'
      });
    });

    it('should use secure cookie in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const clearCookieMock = jest.fn();
      mockResponse.clearCookie = clearCookieMock;

      await authController.logout(mockRequest as Request, mockResponse as Response);

      expect(clearCookieMock).toHaveBeenCalledWith('authToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
      });
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should return 500 on error', async () => {
      mockResponse.clearCookie = jest.fn().mockImplementation(() => {
        throw new Error('Cookie error');
      });

      await authController.logout(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });
});
