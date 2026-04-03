import { AuthApiService } from '../../../src/services/AuthApiService';

global.fetch = jest.fn();

describe('AuthApiService', () => {
  let authApiService: AuthApiService;

  beforeEach(() => {
    authApiService = new AuthApiService('http://localhost:3000/api/auth');
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should send POST request to register endpoint', async () => {
      const mockResponse = {
        success: true,
        message: 'Registration successful',
        token: 'token123',
        user: { id: 1, username: 'testuser' }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => mockResponse
      });

      const result = await authApiService.register({
        username: 'testuser',
        password: 'password123'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: 'testuser', password: 'password123' }),
          credentials: 'include'
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return error response on failure', async () => {
      const mockResponse = {
        success: false,
        message: 'Username already exists'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => mockResponse
      });

      const result = await authApiService.register({
        username: 'existinguser',
        password: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Username already exists');
    });
  });

  describe('login', () => {
    it('should send POST request to login endpoint', async () => {
      const mockResponse = {
        success: true,
        message: 'Login successful',
        token: 'token123',
        user: { id: 1, username: 'testuser' }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => mockResponse
      });

      const result = await authApiService.login({
        username: 'testuser',
        password: 'password123'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: 'testuser', password: 'password123' }),
          credentials: 'include'
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return error response on invalid credentials', async () => {
      const mockResponse = {
        success: false,
        message: 'Invalid credentials'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => mockResponse
      });

      const result = await authApiService.login({
        username: 'testuser',
        password: 'wrongpassword'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });
  });

  describe('custom base URL', () => {
    it('should use custom base URL when provided', async () => {
      const customService = new AuthApiService('http://custom-api.com/auth');
      
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ success: true })
      });

      await customService.login({
        username: 'testuser',
        password: 'password123'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://custom-api.com/auth/login',
        expect.any(Object)
      );
    });
  });
});
