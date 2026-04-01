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
    mockAuthService = new AuthService(null as any) as jest.Mocked<AuthService>;
    authController = new AuthController(mockAuthService);

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      body: {}
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
  });

  describe('register', () => {
    it('should return 201 on successful registration', async () => {
      mockRequest.body = { username: 'testuser', password: 'password123' };
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
    });

    it('should return 400 when username is missing', async () => {
      mockRequest.body = { password: 'password123' };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Username and password are required'
      });
    });

    it('should return 400 when password is missing', async () => {
      mockRequest.body = { username: 'testuser' };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Username and password are required'
      });
    });

    it('should return 400 when username already exists', async () => {
      mockRequest.body = { username: 'existinguser', password: 'password123' };
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
      mockRequest.body = { username: 'testuser', password: 'password123' };
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
});
