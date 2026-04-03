import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../src/middleware/errorHandler';

describe('errorHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    
    mockRequest = {};
    mockResponse = {
      status: statusMock as any,
    };
    mockNext = jest.fn();
    
    // Mock console.error to avoid test output pollution
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('error handling', () => {
    it('should handle generic errors with 500 status', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'An unexpected error occurred',
      });
    });

    it('should log error stack trace', () => {
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(error.stack);
    });

    it('should handle errors without stack traces', () => {
      const error = new Error('No stack');
      error.stack = undefined;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'An unexpected error occurred',
      });
    });

    it('should always return 500 status code', () => {
      const error = new Error('Any error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'An unexpected error occurred',
      });
    });
  });
});
