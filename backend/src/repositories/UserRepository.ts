import { Database } from 'sql.js';
import { User } from '../models/User';

export class UserRepository {
  constructor(private db: Database) {}

  createUser(username: string, passwordHash: string): User {
    const stmt = this.db.prepare(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)'
    );
    
    stmt.run([username, passwordHash]);
    stmt.free();

    const result = this.db.exec(
      'SELECT id, username, password_hash, created_at FROM users WHERE username = ?',
      [username]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error('Failed to create user');
    }

    const row = result[0].values[0];
    return {
      id: row[0] as number,
      username: row[1] as string,
      passwordHash: row[2] as string,
      createdAt: new Date(row[3] as string)
    };
  }

  findByUsername(username: string): User | null {
    const result = this.db.exec(
      'SELECT id, username, password_hash, created_at FROM users WHERE username = ?',
      [username]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    return {
      id: row[0] as number,
      username: row[1] as string,
      passwordHash: row[2] as string,
      createdAt: new Date(row[3] as string)
    };
  }

  findById(id: number): User | null {
    const result = this.db.exec(
      'SELECT id, username, password_hash, created_at FROM users WHERE id = ?',
      [id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    return {
      id: row[0] as number,
      username: row[1] as string,
      passwordHash: row[2] as string,
      createdAt: new Date(row[3] as string)
    };
  }

  userExists(username: string): boolean {
    const result = this.db.exec(
      'SELECT COUNT(*) FROM users WHERE username = ?',
      [username]
    );

    return result.length > 0 && result[0].values[0][0] > 0;
  }
}
