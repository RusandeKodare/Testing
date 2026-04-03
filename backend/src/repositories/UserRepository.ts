import { Database } from 'sql.js';
import { User } from '../models/User';
import { DatabaseConfig } from '../config/database';

export class UserRepository {
  constructor(private db: Database, private dbConfig?: DatabaseConfig) {}

  createUser(username: string, passwordHash: string): User {
    const stmt = this.db.prepare(
      'INSERT INTO users (username, password_hash, login_attempts, locked_until) VALUES (?, ?, 0, NULL)'
    );
    
    stmt.run([username, passwordHash]);
    stmt.free();

    this.dbConfig?.persistChanges();

    const result = this.db.exec(
      'SELECT id, username, password_hash, profile_picture, created_at, login_attempts, locked_until FROM users WHERE username = ?',
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
      profilePicture: row[3] as string | null,
      createdAt: new Date(row[4] as string),
      loginAttempts: row[5] as number,
      lockedUntil: row[6] ? new Date(row[6] as string) : null
    };
  }

  findByUsername(username: string): User | null {
    const result = this.db.exec(
      'SELECT id, username, password_hash, profile_picture, created_at, login_attempts, locked_until FROM users WHERE username = ?',
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
      profilePicture: row[3] as string | null,
      createdAt: new Date(row[4] as string),
      loginAttempts: row[5] as number,
      lockedUntil: row[6] ? new Date(row[6] as string) : null
    };
  }

  findById(id: number): User | null {
    const result = this.db.exec(
      'SELECT id, username, password_hash, profile_picture, created_at, login_attempts, locked_until FROM users WHERE id = ?',
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
      profilePicture: row[3] as string | null,
      createdAt: new Date(row[4] as string),
      loginAttempts: row[5] as number,
      lockedUntil: row[6] ? new Date(row[6] as string) : null
    };
  }

  incrementLoginAttempts(username: string): void {
    const stmt = this.db.prepare(
      'UPDATE users SET login_attempts = login_attempts + 1 WHERE username = ?'
    );
    stmt.run([username]);
    stmt.free();
    this.dbConfig?.persistChanges();
  }

  lockAccount(username: string, lockDurationMinutes: number = 30): void {
    const lockedUntil = new Date(Date.now() + lockDurationMinutes * 60000);
    const stmt = this.db.prepare(
      'UPDATE users SET locked_until = ? WHERE username = ?'
    );
    stmt.run([lockedUntil.toISOString(), username]);
    stmt.free();
    this.dbConfig?.persistChanges();
  }

  resetLoginAttempts(username: string): void {
    const stmt = this.db.prepare(
      'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE username = ?'
    );
    stmt.run([username]);
    stmt.free();
    this.dbConfig?.persistChanges();
  }

  isAccountLocked(user: User): boolean {
    if (!user.lockedUntil) {
      return false;
    }

    const now = new Date();
    const lockedUntil = new Date(user.lockedUntil);

    if (now > lockedUntil) {
      // Lock has expired, reset it
      this.resetLoginAttempts(user.username);
      return false;
    }

    return true;
  }

  userExists(username: string): boolean {
    const result = this.db.exec(
      'SELECT COUNT(*) FROM users WHERE username = ?',
      [username]
    );

    if (result.length === 0 || !result[0].values[0]) {
      return false;
    }

    const count = result[0].values[0][0];
    return typeof count === 'number' && count > 0;
  }

  updateProfilePicture(userId: number, profilePictureData: string): void {
    const stmt = this.db.prepare(
      'UPDATE users SET profile_picture = ? WHERE id = ?'
    );
    stmt.run([profilePictureData, userId]);
    stmt.free();
    this.dbConfig?.persistChanges();
  }

  getProfilePicture(userId: number): string | null {
    const result = this.db.exec(
      'SELECT profile_picture FROM users WHERE id = ?',
      [userId]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    return result[0].values[0][0] as string | null;
  }
}
