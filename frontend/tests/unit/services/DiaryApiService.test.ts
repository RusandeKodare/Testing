import { DiaryApiService } from '../../../src/services/DiaryApiService';

global.fetch = jest.fn();

describe('DiaryApiService', () => {
  let service: DiaryApiService;

  beforeEach(() => {
    service = new DiaryApiService();
    jest.clearAllMocks();
    document.cookie = 'csrfToken=test-csrf-token';
  });

  it('lists diary entries with query string filters', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, entries: [] })
    });

    await service.listEntries({
      search: 'focus',
      mood: 'good',
      tag: undefined,
      limit: '20'
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/diary/entries?search=focus&mood=good&limit=20',
      {
        credentials: 'include'
      }
    );
  });

  it('creates diary entry with csrf header', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, entry: { id: 1 } })
    });

    const payload = { title: 'Today', content: 'Solid day', mood: 'great', tags: ['work'] };
    await service.createEntry(payload);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/diary/entries',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      }
    );
  });

  it('updates diary entry with csrf header', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, entry: { id: 5 } })
    });

    const payload = { title: 'Updated', content: 'Updated body' };
    await service.updateEntry(5, payload);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/diary/entries/5',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      }
    );
  });

  it('gets one diary entry by id', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, entry: { id: 3 } })
    });

    await service.getEntry(3);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/diary/entries/3',
      {
        credentials: 'include'
      }
    );
  });

  it('deletes diary entry with csrf header', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true })
    });

    await service.deleteEntry(9);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/diary/entries/9',
      {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': 'test-csrf-token'
        },
        credentials: 'include'
      }
    );
  });
});
