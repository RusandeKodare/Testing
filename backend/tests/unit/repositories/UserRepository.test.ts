import { UserRepository } from '../../../src/repositories/UserRepository';
import { Database } from 'sql.js';
import initSqlJs from 'sql.js';

describe('UserRepository', () => {
  let db: Database;
  let userRepository: UserRepository;

  beforeEach(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();

    db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        login_attempts INTEGER DEFAULT 0,
        locked_until DATETIME DEFAULT NULL
      )
    `);

    userRepository = new UserRepository(db, undefined);
  });

  afterEach(() => {
    db.close();
  });

  describe('createUser', () => {
    it('should create a new user and return user object', () => {
      const user = userRepository.createUser('testuser', 'hashedpassword');

      expect(user.id).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.passwordHash).toBe('hashedpassword');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.loginAttempts).toBe(0);
      expect(user.lockedUntil).toBeNull();
    });

    it('should throw error when creating duplicate username', () => {
      userRepository.createUser('testuser', 'hashedpassword');

      expect(() => {
        userRepository.createUser('testuser', 'anotherpassword');
      }).toThrow();
    });
  });

  describe('findByUsername', () => {
    it('should return user when username exists', () => {
      userRepository.createUser('testuser', 'hashedpassword');

      const user = userRepository.findByUsername('testuser');

      expect(user).not.toBeNull();
      expect(user?.username).toBe('testuser');
      expect(user?.passwordHash).toBe('hashedpassword');
    });

    it('should return null when username does not exist', () => {
      const user = userRepository.findByUsername('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when id exists', () => {
      const createdUser = userRepository.createUser('testuser', 'hashedpassword');

      const user = userRepository.findById(createdUser.id!);

      expect(user).not.toBeNull();
      expect(user?.id).toBe(createdUser.id);
      expect(user?.username).toBe('testuser');
    });

    it('should return null when id does not exist', () => {
      const user = userRepository.findById(999);

      expect(user).toBeNull();
    });
  });

  describe('userExists', () => {
    it('should return true when user exists', () => {
      userRepository.createUser('testuser', 'hashedpassword');

      const exists = userRepository.userExists('testuser');

      expect(exists).toBe(true);
    });

    it('should return false when user does not exist', () => {
      const exists = userRepository.userExists('nonexistent');

      expect(exists).toBe(false);
    });
  });

  describe('incrementLoginAttempts', () => {
    it('should increment login attempts', () => {
      userRepository.createUser('testuser', 'hashedpassword');

      userRepository.incrementLoginAttempts('testuser');
      let user = userRepository.findByUsername('testuser');
      expect(user?.loginAttempts).toBe(1);

      userRepository.incrementLoginAttempts('testuser');
      user = userRepository.findByUsername('testuser');
      expect(user?.loginAttempts).toBe(2);
    });
  });

  describe('lockAccount', () => {
    it('should lock account until specified time', () => {
      userRepository.createUser('testuser', 'hashedpassword');

      userRepository.lockAccount('testuser', 30);
      const lockedUser = userRepository.findByUsername('testuser');

      expect(lockedUser?.lockedUntil).not.toBeNull();
      expect(lockedUser?.lockedUntil).toBeInstanceOf(Date);
    });
  });

  describe('resetLoginAttempts', () => {
    it('should reset login attempts and lock', () => {
      userRepository.createUser('testuser', 'hashedpassword');
      userRepository.incrementLoginAttempts('testuser');
      userRepository.lockAccount('testuser', 30);

      userRepository.resetLoginAttempts('testuser');
      const user = userRepository.findByUsername('testuser');

      expect(user?.loginAttempts).toBe(0);
      expect(user?.lockedUntil).toBeNull();
    });
  });

  describe('isAccountLocked', () => {
    it('should return false if no lock', () => {
      const user = userRepository.createUser('testuser', 'hashedpassword');
      expect(userRepository.isAccountLocked(user)).toBe(false);
    });

    it('should return true if locked and time not expired', () => {
      userRepository.createUser('testuser', 'hashedpassword');
      userRepository.lockAccount('testuser', 30);
      const lockedUser = userRepository.findByUsername('testuser')!;

      expect(userRepository.isAccountLocked(lockedUser)).toBe(true);
    });
  });
});
