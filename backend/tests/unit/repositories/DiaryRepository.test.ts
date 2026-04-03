import initSqlJs, { Database } from 'sql.js';
import { DiaryRepository } from '../../../src/repositories/DiaryRepository';

describe('DiaryRepository', () => {
  let db: Database;
  let diaryRepository: DiaryRepository;

  beforeEach(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();

    db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE diary_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        mood TEXT DEFAULT NULL,
        tags_json TEXT DEFAULT '[]',
        is_favorite INTEGER DEFAULT 0,
        entry_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    db.run("INSERT INTO users (username, password_hash) VALUES ('alice', 'hash')");
    db.run("INSERT INTO users (username, password_hash) VALUES ('bob', 'hash')");

    diaryRepository = new DiaryRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates and returns a diary entry', () => {
    const entry = diaryRepository.createEntry(1, {
      title: 'Morning reflection',
      content: 'Today felt productive and calm.',
      mood: 'good',
      tags: ['gratitude', 'morning'],
      isFavorite: true,
      entryDate: new Date('2026-04-03T08:00:00.000Z')
    });

    expect(entry.id).toBeGreaterThan(0);
    expect(entry.userId).toBe(1);
    expect(entry.title).toBe('Morning reflection');
    expect(entry.tags).toEqual(['gratitude', 'morning']);
    expect(entry.isFavorite).toBe(true);
  });

  it('returns only entries belonging to the user', () => {
    diaryRepository.createEntry(1, {
      title: 'Alice entry',
      content: 'Private to Alice',
      mood: 'great',
      tags: ['private'],
      isFavorite: false,
      entryDate: new Date('2026-04-03T09:00:00.000Z')
    });

    diaryRepository.createEntry(2, {
      title: 'Bob entry',
      content: 'Private to Bob',
      mood: 'okay',
      tags: ['bob'],
      isFavorite: false,
      entryDate: new Date('2026-04-03T10:00:00.000Z')
    });

    const list = diaryRepository.listEntries(1, { limit: 20, offset: 0 });
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('Alice entry');
  });

  it('filters entries by mood, tag, search, and favorite', () => {
    diaryRepository.createEntry(1, {
      title: 'Gym and focus',
      content: 'Workout improved my focus.',
      mood: 'great',
      tags: ['fitness', 'focus'],
      isFavorite: true,
      entryDate: new Date('2026-04-02T08:00:00.000Z')
    });

    diaryRepository.createEntry(1, {
      title: 'Rough afternoon',
      content: 'Energy dropped after lunch.',
      mood: 'bad',
      tags: ['health'],
      isFavorite: false,
      entryDate: new Date('2026-04-01T08:00:00.000Z')
    });

    const filtered = diaryRepository.listEntries(1, {
      mood: 'great',
      tag: 'fitness',
      search: 'focus',
      favoriteOnly: true,
      limit: 20,
      offset: 0
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Gym and focus');
  });

  it('updates an entry and returns the updated entity', () => {
    const created = diaryRepository.createEntry(1, {
      title: 'Draft',
      content: 'Initial content',
      mood: null,
      tags: [],
      isFavorite: false,
      entryDate: new Date('2026-04-03T08:00:00.000Z')
    });

    const updated = diaryRepository.updateEntry(created.id, 1, {
      title: 'Updated draft',
      content: 'Edited and expanded content',
      mood: 'good',
      tags: ['edited'],
      isFavorite: true,
      entryDate: new Date('2026-04-03T09:00:00.000Z')
    });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe('Updated draft');
    expect(updated?.isFavorite).toBe(true);
    expect(updated?.tags).toEqual(['edited']);
  });

  it('returns null when updating non-owned entry', () => {
    const created = diaryRepository.createEntry(2, {
      title: 'Bob private',
      content: 'no access',
      mood: null,
      tags: [],
      isFavorite: false,
      entryDate: new Date('2026-04-03T09:00:00.000Z')
    });

    const updated = diaryRepository.updateEntry(created.id, 1, {
      title: 'Attempted takeover',
      content: 'should fail',
      mood: 'bad',
      tags: ['hack'],
      isFavorite: false,
      entryDate: new Date('2026-04-03T09:00:00.000Z')
    });

    expect(updated).toBeNull();
  });

  it('deletes only owned entries', () => {
    const created = diaryRepository.createEntry(1, {
      title: 'Temporary entry',
      content: 'delete me',
      mood: null,
      tags: [],
      isFavorite: false,
      entryDate: new Date('2026-04-03T09:00:00.000Z')
    });

    const deleted = diaryRepository.deleteEntry(created.id, 1);
    const missing = diaryRepository.findEntryById(created.id, 1);

    expect(deleted).toBe(true);
    expect(missing).toBeNull();
  });

  it('counts entries using the same filters as list', () => {
    diaryRepository.createEntry(1, {
      title: 'Great day',
      content: 'Deep work and progress.',
      mood: 'great',
      tags: ['work'],
      isFavorite: true,
      entryDate: new Date('2026-04-03T09:00:00.000Z')
    });

    diaryRepository.createEntry(1, {
      title: 'Okay day',
      content: 'Steady pace.',
      mood: 'okay',
      tags: ['work'],
      isFavorite: false,
      entryDate: new Date('2026-04-02T09:00:00.000Z')
    });

    const total = diaryRepository.countEntries(1, {
      mood: 'great',
      favoriteOnly: true
    });

    expect(total).toBe(1);
  });
});
