import { DatabaseConfig } from '../../../src/config/database';
import * as fs from 'fs';
import initSqlJs from 'sql.js';

describe('DatabaseConfig', () => {
  const testDbPath = './test-db.sqlite';
  let dbConfig: DatabaseConfig;

  afterEach(() => {
    if (dbConfig) {
      dbConfig.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('initialize', () => {
    it('should create a new database if file does not exist', async () => {
      dbConfig = new DatabaseConfig(testDbPath);
      await dbConfig.initialize();

      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('should load existing database if file exists', async () => {
      dbConfig = new DatabaseConfig(testDbPath);
      await dbConfig.initialize();
      dbConfig.close();

      dbConfig = new DatabaseConfig(testDbPath);
      await dbConfig.initialize();

      expect(dbConfig.getDatabase()).toBeDefined();
    });

    it('should create users table on initialization', async () => {
      dbConfig = new DatabaseConfig(testDbPath);
      await dbConfig.initialize();

      const db = dbConfig.getDatabase();
      const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");

      expect(result.length).toBeGreaterThan(0);
    });

    it('should create diary_entries table on initialization', async () => {
      dbConfig = new DatabaseConfig(testDbPath);
      await dbConfig.initialize();

      const db = dbConfig.getDatabase();
      const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='diary_entries'");

      expect(result.length).toBeGreaterThan(0);
    });

    it('should migrate legacy users table schema for existing databases', async () => {
      const SQL = await initSqlJs();
      const legacyDb = new SQL.Database();
      legacyDb.run(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const data = legacyDb.export();
      fs.writeFileSync(testDbPath, data);
      legacyDb.close();

      dbConfig = new DatabaseConfig(testDbPath);
      await dbConfig.initialize();

      const db = dbConfig.getDatabase();
      const columnsResult = db.exec('PRAGMA table_info(users)');
      const columns = columnsResult[0].values.map((row) => String(row[1]));

      expect(columns).toContain('profile_picture');
      expect(columns).toContain('email');
      expect(columns).toContain('oauth_provider');
      expect(columns).toContain('oauth_id');
      expect(columns).toContain('login_attempts');
      expect(columns).toContain('locked_until');

      const diaryColumnsResult = db.exec('PRAGMA table_info(diary_entries)');
      const diaryColumns = diaryColumnsResult[0].values.map((row) => String(row[1]));
      expect(diaryColumns).toContain('title');
      expect(diaryColumns).toContain('content');
      expect(diaryColumns).toContain('mood');
      expect(diaryColumns).toContain('tags_json');
      expect(diaryColumns).toContain('is_favorite');
      expect(diaryColumns).toContain('entry_date');
      expect(diaryColumns).toContain('updated_at');

      const indexResult = db.exec("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_oauth_user'");
      expect(indexResult.length).toBeGreaterThan(0);
    });
  });

  describe('getDatabase', () => {
    it('should throw error if database not initialized', () => {
      dbConfig = new DatabaseConfig(testDbPath);

      expect(() => dbConfig.getDatabase()).toThrow('Database not initialized');
    });

    it('should return database instance when initialized', async () => {
      dbConfig = new DatabaseConfig(testDbPath);
      await dbConfig.initialize();

      const db = dbConfig.getDatabase();

      expect(db).toBeDefined();
    });
  });

  describe('save', () => {
    it('should throw error if database not initialized', () => {
      dbConfig = new DatabaseConfig(testDbPath);

      expect(() => dbConfig.save()).toThrow('Database not initialized');
    });

    it('should persist database to file', async () => {
      dbConfig = new DatabaseConfig(testDbPath);
      await dbConfig.initialize();

      dbConfig.save();

      expect(fs.existsSync(testDbPath)).toBe(true);
      expect(fs.statSync(testDbPath).size).toBeGreaterThan(0);
    });
  });

  describe('close', () => {
    it('should save and close database', async () => {
      dbConfig = new DatabaseConfig(testDbPath);
      await dbConfig.initialize();

      dbConfig.close();

      expect(() => dbConfig.getDatabase()).toThrow('Database not initialized');
    });

    it('should save database to file', async () => {
      dbConfig = new DatabaseConfig(testDbPath);
      await dbConfig.initialize();
      dbConfig.save();

      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('should create directory if it does not exist', async () => {
      const nestedPath = './test-dir/nested/db.sqlite';
      dbConfig = new DatabaseConfig(nestedPath);
      await dbConfig.initialize();
      dbConfig.save();

      expect(fs.existsSync(nestedPath)).toBe(true);
      
      // Cleanup
      dbConfig.close();
      if (fs.existsSync(nestedPath)) {
        fs.unlinkSync(nestedPath);
      }
      if (fs.existsSync('./test-dir/nested')) {
        fs.rmdirSync('./test-dir/nested');
      }
      if (fs.existsSync('./test-dir')) {
        fs.rmdirSync('./test-dir');
      }
    });
  });

  describe('persistChanges', () => {
    it('should persist changes to database file', async () => {
      dbConfig = new DatabaseConfig(testDbPath);
      await dbConfig.initialize();
      dbConfig.persistChanges();

      expect(fs.existsSync(testDbPath)).toBe(true);
    });
  });
});
