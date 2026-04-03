import { Response } from 'express';
import { createDiaryRoutes } from '../../../src/routes/diaryRoutes';

const createRes = (): { res: Response; status: jest.Mock; json: jest.Mock } => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return {
    res: { status } as unknown as Response,
    status,
    json
  };
};

const getRouteHandler = (router: ReturnType<typeof createDiaryRoutes>, path: string, method: 'get' | 'post' | 'put' | 'delete') => {
  const layer = (router as any).stack.find((entry: any) => entry.route?.path === path && entry.route?.methods?.[method]);
  if (!layer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }
  return layer.route.stack[0].handle;
};

describe('diaryRoutes', () => {
  const repo = {
    listEntries: jest.fn(),
    countEntries: jest.fn(),
    createEntry: jest.fn(),
    findEntryById: jest.fn(),
    updateEntry: jest.fn(),
    deleteEntry: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists diary entries for authenticated user', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries', 'get');
    const { res, status, json } = createRes();

    repo.listEntries.mockReturnValue([{ id: 1, title: 'Entry' }]);
    repo.countEntries.mockReturnValue(1);

    await handler({ user: { userId: 3 }, query: {} }, res);

    expect(repo.listEntries).toHaveBeenCalledWith(3, expect.objectContaining({ limit: 20, offset: 0 }));
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      entries: [{ id: 1, title: 'Entry' }],
      pagination: {
        total: 1,
        limit: 20,
        offset: 0
      }
    });
  });

  it('creates diary entry with valid payload', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries', 'post');
    const { res, status, json } = createRes();

    repo.createEntry.mockReturnValue({ id: 11, title: 'Created' });

    await handler(
      {
        user: { userId: 7 },
        body: {
          title: 'Created',
          content: 'A valid diary body',
          mood: 'good',
          tags: ['focus'],
          isFavorite: true,
          entryDate: '2026-04-03T10:00:00.000Z'
        }
      },
      res
    );

    expect(repo.createEntry).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        title: 'Created',
        content: 'A valid diary body',
        mood: 'good',
        tags: ['focus'],
        isFavorite: true
      })
    );
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({ success: true, entry: { id: 11, title: 'Created' } });
  });

  it('rejects invalid mood on create', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries', 'post');
    const { res, status, json } = createRes();

    await handler(
      {
        user: { userId: 7 },
        body: {
          title: 'Created',
          content: 'A valid diary body',
          mood: 'amazing'
        }
      },
      res
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Mood must be one of: great, good, okay, bad, awful' });
  });

  it('gets a specific diary entry by id', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries/:id', 'get');
    const { res, status, json } = createRes();

    repo.findEntryById.mockReturnValue({ id: 2, title: 'Found' });

    await handler({ user: { userId: 1 }, params: { id: '2' } }, res);

    expect(repo.findEntryById).toHaveBeenCalledWith(2, 1);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ success: true, entry: { id: 2, title: 'Found' } });
  });

  it('returns not found for missing diary entry', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries/:id', 'get');
    const { res, status, json } = createRes();

    repo.findEntryById.mockReturnValue(null);

    await handler({ user: { userId: 1 }, params: { id: '999' } }, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Diary entry not found' });
  });

  it('updates diary entry and returns result', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries/:id', 'put');
    const { res, status, json } = createRes();

    repo.updateEntry.mockReturnValue({ id: 2, title: 'Updated' });

    await handler(
      {
        user: { userId: 1 },
        params: { id: '2' },
        body: {
          title: 'Updated',
          content: 'Updated body',
          mood: 'okay',
          tags: ['update']
        }
      },
      res
    );

    expect(repo.updateEntry).toHaveBeenCalledWith(2, 1, expect.objectContaining({ title: 'Updated' }));
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ success: true, entry: { id: 2, title: 'Updated' } });
  });

  it('returns not found when update target does not exist', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries/:id', 'put');
    const { res, status, json } = createRes();

    repo.updateEntry.mockReturnValue(null);

    await handler(
      {
        user: { userId: 1 },
        params: { id: '2' },
        body: {
          title: 'Updated',
          content: 'Updated body'
        }
      },
      res
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Diary entry not found' });
  });

  it('deletes diary entry', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries/:id', 'delete');
    const { res, status, json } = createRes();

    repo.deleteEntry.mockReturnValue(true);

    await handler({ user: { userId: 5 }, params: { id: '6' } }, res);

    expect(repo.deleteEntry).toHaveBeenCalledWith(6, 5);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ success: true, message: 'Diary entry deleted' });
  });

  it('returns unauthorized when user context is missing', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries', 'get');
    const { res, status, json } = createRes();

    await handler({ user: undefined, query: {} }, res);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized' });
  });

  it('normalizes list query params and applies favorite/date filters', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries', 'get');
    const { res } = createRes();

    repo.listEntries.mockReturnValue([]);
    repo.countEntries.mockReturnValue(0);

    await handler(
      {
        user: { userId: 12 },
        query: {
          search: '  Reflection  ',
          mood: 'GOOD',
          tag: 'Work',
          favorite: '1',
          from: '2026-04-01T00:00:00.000Z',
          to: '2026-04-30T23:59:59.999Z',
          limit: '200',
          offset: '-4'
        }
      },
      res
    );

    expect(repo.listEntries).toHaveBeenCalledWith(
      12,
      expect.objectContaining({
        search: 'Reflection',
        mood: 'good',
        tag: 'work',
        favoriteOnly: true,
        limit: 50,
        offset: 0
      })
    );
  });

  it('rejects list request when search term exceeds max length', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries', 'get');
    const { res, status, json } = createRes();

    await handler(
      {
        user: { userId: 2 },
        query: { search: 'x'.repeat(121) }
      },
      res
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Search term must be 120 characters or fewer' });
  });

  it('returns 500 when repository fails during list', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries', 'get');
    const { res, status, json } = createRes();

    repo.listEntries.mockImplementation(() => {
      throw new Error('db read failure');
    });

    await handler({ user: { userId: 3 }, query: {} }, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'db read failure' });
  });

  it('rejects create payload with invalid tags', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries', 'post');
    const { res, status, json } = createRes();

    await handler(
      {
        user: { userId: 5 },
        body: {
          content: 'text',
          tags: ['valid', 'bad tag with spaces']
        }
      },
      res
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Tags must be 1-20 chars and contain only letters, numbers, underscore, or hyphen'
    });
  });

  it('returns 500 when repository fails during create', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries', 'post');
    const { res, status, json } = createRes();

    repo.createEntry.mockImplementation(() => {
      throw new Error('insert failure');
    });

    await handler(
      {
        user: { userId: 5 },
        body: {
          content: 'text'
        }
      },
      res
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'insert failure' });
  });

  it('rejects invalid entry id when fetching one entry', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries/:id', 'get');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 1 }, params: { id: 'abc' } }, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Entry id must be a positive integer' });
  });

  it('rejects invalid entry id when updating', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries/:id', 'put');
    const { res, status, json } = createRes();

    await handler(
      {
        user: { userId: 1 },
        params: { id: '-1' },
        body: { content: 'text' }
      },
      res
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Entry id must be a positive integer' });
  });

  it('returns 500 when repository fails during update', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries/:id', 'put');
    const { res, status, json } = createRes();

    repo.updateEntry.mockImplementation(() => {
      throw new Error('update failure');
    });

    await handler(
      {
        user: { userId: 1 },
        params: { id: '1' },
        body: { content: 'text' }
      },
      res
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'update failure' });
  });

  it('rejects invalid entry id when deleting', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries/:id', 'delete');
    const { res, status, json } = createRes();

    await handler({ user: { userId: 2 }, params: { id: '0' } }, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Entry id must be a positive integer' });
  });

  it('returns not found when deleting missing entry', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries/:id', 'delete');
    const { res, status, json } = createRes();

    repo.deleteEntry.mockReturnValue(false);
    await handler({ user: { userId: 2 }, params: { id: '40' } }, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Diary entry not found' });
  });

  it('returns 500 when repository fails during delete', async () => {
    const router = createDiaryRoutes(repo as any, 'secret');
    const handler = getRouteHandler(router, '/entries/:id', 'delete');
    const { res, status, json } = createRes();

    repo.deleteEntry.mockImplementation(() => {
      throw new Error('delete failure');
    });

    await handler({ user: { userId: 2 }, params: { id: '8' } }, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ success: false, message: 'Failed to delete diary entry' });
  });
});
