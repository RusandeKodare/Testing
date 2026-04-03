import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

export class DatabaseConfig {
  private db: Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = path.join(__dirname, '../../database/auth.db')) {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    const SQL = await initSqlJs();
    const dbFileExists = fs.existsSync(this.dbPath);
    
    if (dbFileExists) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    const createdTables = this.createTables();
    const migrated = this.migrateSchema();
    this.ensureIndexes();
    if (createdTables || migrated || !dbFileExists) {
      this.save();
    }
  }

  private createTables(): boolean {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const hadUsersTable = this.tableExists('users');
    const hadDiaryEntriesTable = this.tableExists('diary_entries');

    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        profile_picture TEXT DEFAULT NULL,
        email TEXT DEFAULT NULL,
        oauth_provider TEXT DEFAULT NULL,
        oauth_id TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        login_attempts INTEGER DEFAULT 0,
        locked_until DATETIME DEFAULT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS diary_entries (
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

    return !hadUsersTable || !hadDiaryEntriesTable;
  }

  private tableExists(tableName: string): boolean {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
      [tableName]
    );

    return result.length > 0 && result[0].values.length > 0;
  }

  private ensureIndexes(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_user 
      ON users(oauth_provider, oauth_id) 
      WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL
    `);

    this.db.run('CREATE INDEX IF NOT EXISTS idx_diary_user_id ON diary_entries(user_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_diary_entry_date ON diary_entries(entry_date)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_diary_mood ON diary_entries(mood)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_diary_favorite ON diary_entries(is_favorite)');
  }

  private migrateSchema(): boolean {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.exec('PRAGMA table_info(users)');
    if (result.length === 0 || result[0].values.length === 0) {
      return false;
    }

    const existingColumns = new Set(
      result[0].values.map((row) => String(row[1]))
    );

    const requiredColumns: Array<{ name: string; sql: string }> = [
      { name: 'profile_picture', sql: 'ALTER TABLE users ADD COLUMN profile_picture TEXT DEFAULT NULL' },
      { name: 'email', sql: 'ALTER TABLE users ADD COLUMN email TEXT DEFAULT NULL' },
      { name: 'oauth_provider', sql: 'ALTER TABLE users ADD COLUMN oauth_provider TEXT DEFAULT NULL' },
      { name: 'oauth_id', sql: 'ALTER TABLE users ADD COLUMN oauth_id TEXT DEFAULT NULL' },
      { name: 'login_attempts', sql: 'ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0' },
      { name: 'locked_until', sql: 'ALTER TABLE users ADD COLUMN locked_until DATETIME DEFAULT NULL' }
    ];

    let changed = false;
    for (const column of requiredColumns) {
      if (!existingColumns.has(column.name)) {
        this.db.run(column.sql);
        changed = true;
      }
    }

    return this.migrateDiarySchema() || changed;
  }

  private migrateDiarySchema(): boolean {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.exec('PRAGMA table_info(diary_entries)');
    if (result.length === 0 || result[0].values.length === 0) {
      return false;
    }

    const existingColumns = new Set(result[0].values.map((row) => String(row[1])));
    const requiredColumns: Array<{ name: string; sql: string }> = [
      { name: 'title', sql: "ALTER TABLE diary_entries ADD COLUMN title TEXT DEFAULT 'Untitled entry'" },
      { name: 'content', sql: "ALTER TABLE diary_entries ADD COLUMN content TEXT DEFAULT ''" },
      { name: 'mood', sql: 'ALTER TABLE diary_entries ADD COLUMN mood TEXT DEFAULT NULL' },
      { name: 'tags_json', sql: "ALTER TABLE diary_entries ADD COLUMN tags_json TEXT DEFAULT '[]'" },
      { name: 'is_favorite', sql: 'ALTER TABLE diary_entries ADD COLUMN is_favorite INTEGER DEFAULT 0' },
      { name: 'entry_date', sql: 'ALTER TABLE diary_entries ADD COLUMN entry_date DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'created_at', sql: 'ALTER TABLE diary_entries ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', sql: 'ALTER TABLE diary_entries ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP' }
    ];

    let changed = false;
    for (const column of requiredColumns) {
      if (!existingColumns.has(column.name)) {
        this.db.run(column.sql);
        changed = true;
      }
    }

    return changed;
  }

  getDatabase(): Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  save(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = this.db.export();
    fs.writeFileSync(this.dbPath, data);
  }

  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }

  persistChanges(): void {
    this.save();
  }
}
