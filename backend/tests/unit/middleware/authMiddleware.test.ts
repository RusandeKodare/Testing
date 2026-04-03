import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createAuthMiddleware, AuthenticatedRequest } from '../../../src/middleware/authMiddleware';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

describe('authMiddleware', () => {
  const next: NextFunction = jest.fn();

  const createRes = (): { res: Response; status: jest.Mock; json: jest.Mock } => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return {
      res: { status } as unknown as Response,
      status,
      json
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns unauthorized when token is missing', () => {
    const middleware = createAuthMiddleware('secret');
    const { res, status, json } = createRes();
    const req = { headers: {}, cookies: {} } as AuthenticatedRequest;

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns unauthorized when token verification fails', () => {
    const middleware = createAuthMiddleware('secret');
    const { res, status, json } = createRes();
    const req = {
      headers: { authorization: 'Bearer token' },
      cookies: {}
    } as unknown as AuthenticatedRequest;
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid token');
    });

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized' });
  });

  it('returns unauthorized when decoded token has no user id', () => {
    const middleware = createAuthMiddleware('secret');
    const { res, status, json } = createRes();
    const req = {
      headers: { authorization: 'Bearer token' },
      cookies: {}
    } as unknown as AuthenticatedRequest;
    (jwt.verify as jest.Mock).mockReturnValue({ username: 'alice' });

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts valid bearer token and populates req.user', () => {
    const middleware = createAuthMiddleware('secret');
    const { res } = createRes();
    const req = {
      headers: { authorization: 'Bearer valid-token' },
      cookies: {}
    } as unknown as AuthenticatedRequest;
    (jwt.verify as jest.Mock).mockReturnValue({ id: 42, username: 'alice', email: 'alice@example.com' });

    middleware(req, res, next);

    expect(req.user).toEqual({
      userId: 42,
      username: 'alice',
      email: 'alice@example.com'
    });
    expect(next).toHaveBeenCalled();
  });

  it('accepts valid auth cookie token when header is missing', () => {
    const middleware = createAuthMiddleware('secret');
    const { res } = createRes();
    const req = {
      headers: {},
      cookies: { authToken: 'cookie-token' }
    } as unknown as AuthenticatedRequest;
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 7, username: 'cookie-user' });

    middleware(req, res, next);

    expect(req.user).toEqual({
      userId: 7,
      username: 'cookie-user',
      email: undefined
    });
    expect(next).toHaveBeenCalled();
  });
});