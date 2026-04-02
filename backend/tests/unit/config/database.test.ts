import { DatabaseConfig } from '../../../src/config/database';
import * as fs from 'fs';

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

  describe('close', () => {
    it('should close database connection', async () => {
      dbConfig = new DatabaseConfig(testDbPath);
      await dbConfig.initialize();
      dbConfig.close();

      expect(() => dbConfig.getDatabase()).toThrow('Database not initialized');
    });
  });
});
