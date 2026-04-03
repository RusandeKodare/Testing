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
    
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
      this.createTables();
      this.save();
    }
  }

  private createTables(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

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
    
    // Create unique index for OAuth users
    this.db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_user 
      ON users(oauth_provider, oauth_id) 
      WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL
    `);
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
