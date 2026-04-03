import { Router, Response } from 'express';
import { AuthenticatedRequest, createAuthMiddleware } from '../middleware/authMiddleware';
import { DiaryRepository } from '../repositories/DiaryRepository';
import { CreateDiaryEntryInput, DiaryEntryQuery, UpdateDiaryEntryInput } from '../models/DiaryEntry';
import { getLogger } from '../utils/logger';

const logger = getLogger('diary');

const VALID_MOODS = new Set(['great', 'good', 'okay', 'bad', 'awful']);

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }
  return false;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== 'string') {
      continue;
    }

    const tag = raw.trim().toLowerCase();
    if (!tag) {
      continue;
    }

    if (!/^[a-z0-9_-]{1,20}$/.test(tag)) {
      throw new Error('Tags must be 1-20 chars and contain only letters, numbers, underscore, or hyphen');
    }

    unique.add(tag);
  }

  if (unique.size > 10) {
    throw new Error('No more than 10 tags are allowed per entry');
  }

  return Array.from(unique);
}

function parseEntryDate(value: unknown): Date {
  if (!value) {
    return new Date();
  }

  if (typeof value !== 'string') {
    throw new Error('entryDate must be an ISO date string');
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('entryDate must be a valid date');
  }

  return parsed;
}

function validateEntryPayload(payload: any): CreateDiaryEntryInput | UpdateDiaryEntryInput {
  const rawTitle = typeof payload?.title === 'string' ? payload.title.trim() : '';
  const content = typeof payload?.content === 'string' ? payload.content.trim() : '';
  const mood = typeof payload?.mood === 'string' ? payload.mood.trim().toLowerCase() : '';

  const title = rawTitle || 'Untitled entry';

  if (!title || title.length > 120) {
    throw new Error('Title must be between 1 and 120 characters');
  }

  if (!content || content.length > 10000) {
    throw new Error('Content must be between 1 and 10000 characters');
  }

  const normalizedMood = mood || null;
  if (normalizedMood && !VALID_MOODS.has(normalizedMood)) {
    throw new Error('Mood must be one of: great, good, okay, bad, awful');
  }

  return {
    title,
    content,
    mood: normalizedMood,
    tags: normalizeTags(payload?.tags),
    isFavorite: parseBoolean(payload?.isFavorite),
    entryDate: parseEntryDate(payload?.entryDate)
  };
}

function parseListQuery(query: any): DiaryEntryQuery {
  const limitRaw = typeof query?.limit === 'string' ? Number(query.limit) : 20;
  const offsetRaw = typeof query?.offset === 'string' ? Number(query.offset) : 0;

  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 50) : 20;
  const offset = Number.isFinite(offsetRaw) ? Math.min(Math.max(Math.floor(offsetRaw), 0), 5000) : 0;

  const search = typeof query?.search === 'string' ? query.search.trim() : '';
  const mood = typeof query?.mood === 'string' ? query.mood.trim().toLowerCase() : '';
  const tag = typeof query?.tag === 'string' ? query.tag.trim().toLowerCase() : '';
  const favoriteOnly = parseBoolean(query?.favorite);

  if (search.length > 120) {
    throw new Error('Search term must be 120 characters or fewer');
  }

  if (mood && !VALID_MOODS.has(mood)) {
    throw new Error('Mood filter must be one of: great, good, okay, bad, awful');
  }

  if (tag && !/^[a-z0-9_-]{1,20}$/.test(tag)) {
    throw new Error('Tag filter must be 1-20 chars and contain only letters, numbers, underscore, or hyphen');
  }

  const fromDate = query?.from ? parseEntryDate(query.from) : undefined;
  const toDate = query?.to ? parseEntryDate(query.to) : undefined;

  return {
    search: search || undefined,
    mood: mood || undefined,
    tag: tag || undefined,
    favoriteOnly,
    fromDate,
    toDate,
    limit,
    offset
  };
}

export function createDiaryRoutes(diaryRepository: DiaryRepository, jwtSecret: string): Router {
  const router = Router();
  const authenticate = createAuthMiddleware(jwtSecret);

  router.use(authenticate);

  router.get('/entries', (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const query = parseListQuery(req.query);
      const entries = diaryRepository.listEntries(userId, query);
      const total = diaryRepository.countEntries(userId, query);

      res.status(200).json({
        success: true,
        entries,
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list diary entries';
      const status = message.includes('must be') || message.includes('No more than') ? 400 : 500;
      if (status === 500) {
        logger.error({ message }, 'Failed to list diary entries');
      }
      res.status(status).json({ success: false, message });
    }
  });

  router.post('/entries', (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const input = validateEntryPayload(req.body);
      const entry = diaryRepository.createEntry(userId, input);

      res.status(201).json({ success: true, entry });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create diary entry';
      const status = message.includes('must be') || message.includes('No more than') ? 400 : 500;
      if (status === 500) {
        logger.error({ message }, 'Failed to create diary entry');
      }
      res.status(status).json({ success: false, message });
    }
  });

  router.get('/entries/:id', (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const entryId = Number(req.params.id);

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!Number.isInteger(entryId) || entryId <= 0) {
        res.status(400).json({ success: false, message: 'Entry id must be a positive integer' });
        return;
      }

      const entry = diaryRepository.findEntryById(entryId, userId);
      if (!entry) {
        res.status(404).json({ success: false, message: 'Diary entry not found' });
        return;
      }

      res.status(200).json({ success: true, entry });
    } catch (error) {
      logger.error({ message: error instanceof Error ? error.message : String(error) }, 'Failed to fetch diary entry');
      res.status(500).json({ success: false, message: 'Failed to fetch diary entry' });
    }
  });

  router.put('/entries/:id', (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const entryId = Number(req.params.id);

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!Number.isInteger(entryId) || entryId <= 0) {
        res.status(400).json({ success: false, message: 'Entry id must be a positive integer' });
        return;
      }

      const input = validateEntryPayload(req.body);
      const entry = diaryRepository.updateEntry(entryId, userId, input);
      if (!entry) {
        res.status(404).json({ success: false, message: 'Diary entry not found' });
        return;
      }

      res.status(200).json({ success: true, entry });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update diary entry';
      const status = message.includes('must be') || message.includes('No more than') ? 400 : 500;
      if (status === 500) {
        logger.error({ message }, 'Failed to update diary entry');
      }
      res.status(status).json({ success: false, message });
    }
  });

  router.delete('/entries/:id', (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const entryId = Number(req.params.id);

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!Number.isInteger(entryId) || entryId <= 0) {
        res.status(400).json({ success: false, message: 'Entry id must be a positive integer' });
        return;
      }

      const deleted = diaryRepository.deleteEntry(entryId, userId);
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Diary entry not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Diary entry deleted' });
    } catch (error) {
      logger.error({ message: error instanceof Error ? error.message : String(error) }, 'Failed to delete diary entry');
      res.status(500).json({ success: false, message: 'Failed to delete diary entry' });
    }
  });

  return router;
}
