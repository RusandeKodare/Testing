import { Database } from 'sql.js';
import { DatabaseConfig } from '../config/database';
import { CreateDiaryEntryInput, DiaryEntry, DiaryEntryQuery, UpdateDiaryEntryInput } from '../models/DiaryEntry';

interface RawDiaryRow {
  id: number;
  user_id: number;
  title: string;
  content: string;
  mood: string | null;
  tags_json: string;
  is_favorite: number;
  entry_date: string;
  created_at: string;
  updated_at: string;
}

export class DiaryRepository {
  constructor(private db: Database, private dbConfig?: DatabaseConfig) {}

  createEntry(userId: number, input: CreateDiaryEntryInput): DiaryEntry {
    const stmt = this.db.prepare(
      `INSERT INTO diary_entries (user_id, title, content, mood, tags_json, is_favorite, entry_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    );

    stmt.run([
      userId,
      input.title,
      input.content,
      input.mood,
      JSON.stringify(input.tags),
      input.isFavorite ? 1 : 0,
      input.entryDate.toISOString()
    ]);
    stmt.free();

    this.dbConfig?.persistChanges();

    const idResult = this.db.exec('SELECT last_insert_rowid() AS id');
    const entryId = idResult[0].values[0][0] as number;

    const created = this.findEntryById(entryId, userId);
    if (!created) {
      throw new Error('Failed to load created diary entry');
    }

    return created;
  }

  findEntryById(entryId: number, userId: number): DiaryEntry | null {
    const result = this.db.exec(
      `SELECT id, user_id, title, content, mood, tags_json, is_favorite, entry_date, created_at, updated_at
       FROM diary_entries
       WHERE id = ? AND user_id = ?`,
      [entryId, userId]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    return this.mapRow(result[0].values[0] as unknown as RawDiaryRow);
  }

  updateEntry(entryId: number, userId: number, input: UpdateDiaryEntryInput): DiaryEntry | null {
    const stmt = this.db.prepare(
      `UPDATE diary_entries
       SET title = ?,
           content = ?,
           mood = ?,
           tags_json = ?,
           is_favorite = ?,
           entry_date = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    );

    stmt.run([
      input.title,
      input.content,
      input.mood,
      JSON.stringify(input.tags),
      input.isFavorite ? 1 : 0,
      input.entryDate.toISOString(),
      entryId,
      userId
    ]);
    stmt.free();

    this.dbConfig?.persistChanges();

    return this.findEntryById(entryId, userId);
  }

  deleteEntry(entryId: number, userId: number): boolean {
    const stmt = this.db.prepare('DELETE FROM diary_entries WHERE id = ? AND user_id = ?');
    stmt.run([entryId, userId]);

    const changesResult = this.db.exec('SELECT changes() AS changes');
    const changes = Number(changesResult[0].values[0][0] || 0);

    stmt.free();
    this.dbConfig?.persistChanges();

    return changes > 0;
  }

  listEntries(userId: number, query: DiaryEntryQuery): DiaryEntry[] {
    const whereClauses: string[] = ['user_id = ?'];
    const params: Array<string | number> = [userId];

    if (query.search) {
      whereClauses.push('(LOWER(title) LIKE ? OR LOWER(content) LIKE ?)');
      const normalized = `%${query.search.toLowerCase()}%`;
      params.push(normalized, normalized);
    }

    if (query.mood) {
      whereClauses.push('mood = ?');
      params.push(query.mood);
    }

    if (query.tag) {
      whereClauses.push('tags_json LIKE ?');
      params.push(`%\"${query.tag}\"%`);
    }

    if (query.favoriteOnly) {
      whereClauses.push('is_favorite = 1');
    }

    if (query.fromDate) {
      whereClauses.push('entry_date >= ?');
      params.push(query.fromDate.toISOString());
    }

    if (query.toDate) {
      whereClauses.push('entry_date <= ?');
      params.push(query.toDate.toISOString());
    }

    params.push(query.limit, query.offset);

    const result = this.db.exec(
      `SELECT id, user_id, title, content, mood, tags_json, is_favorite, entry_date, created_at, updated_at
       FROM diary_entries
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY entry_date DESC, updated_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    return result[0].values.map((row) => this.mapRow(row as unknown as RawDiaryRow));
  }

  countEntries(userId: number, query: Omit<DiaryEntryQuery, 'limit' | 'offset'>): number {
    const whereClauses: string[] = ['user_id = ?'];
    const params: Array<string | number> = [userId];

    if (query.search) {
      whereClauses.push('(LOWER(title) LIKE ? OR LOWER(content) LIKE ?)');
      const normalized = `%${query.search.toLowerCase()}%`;
      params.push(normalized, normalized);
    }

    if (query.mood) {
      whereClauses.push('mood = ?');
      params.push(query.mood);
    }

    if (query.tag) {
      whereClauses.push('tags_json LIKE ?');
      params.push(`%\"${query.tag}\"%`);
    }

    if (query.favoriteOnly) {
      whereClauses.push('is_favorite = 1');
    }

    if (query.fromDate) {
      whereClauses.push('entry_date >= ?');
      params.push(query.fromDate.toISOString());
    }

    if (query.toDate) {
      whereClauses.push('entry_date <= ?');
      params.push(query.toDate.toISOString());
    }

    const result = this.db.exec(
      `SELECT COUNT(*) AS total
       FROM diary_entries
       WHERE ${whereClauses.join(' AND ')}`,
      params
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return 0;
    }

    return Number(result[0].values[0][0] || 0);
  }

  private mapRow(row: RawDiaryRow | any[]): DiaryEntry {
    const source = Array.isArray(row)
      ? {
          id: row[0],
          user_id: row[1],
          title: row[2],
          content: row[3],
          mood: row[4],
          tags_json: row[5],
          is_favorite: row[6],
          entry_date: row[7],
          created_at: row[8],
          updated_at: row[9]
        }
      : row;

    let tags: string[] = [];
    if (typeof source.tags_json === 'string') {
      try {
        const parsed = JSON.parse(source.tags_json);
        if (Array.isArray(parsed)) {
          tags = parsed.filter((item) => typeof item === 'string');
        }
      } catch {
        tags = [];
      }
    }

    return {
      id: Number(source.id),
      userId: Number(source.user_id),
      title: String(source.title || ''),
      content: String(source.content || ''),
      mood: source.mood ? String(source.mood) : null,
      tags,
      isFavorite: Number(source.is_favorite) === 1,
      entryDate: new Date(String(source.entry_date)),
      createdAt: new Date(String(source.created_at)),
      updatedAt: new Date(String(source.updated_at))
    };
  }
}
