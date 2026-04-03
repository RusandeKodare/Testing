import { Request, Response } from 'express';
import { healthHandler } from '../../../src/routes/healthRoutes';

describe('healthRoutes', () => {
  it('should return backend health status', () => {
    const req = {} as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    healthHandler(req, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        service: 'backend',
      })
    );
  });
});
