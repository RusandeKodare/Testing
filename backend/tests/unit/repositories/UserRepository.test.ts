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

    db.run(`
      CREATE UNIQUE INDEX idx_oauth_user
      ON users(oauth_provider, oauth_id)
      WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL
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

  describe('updateProfilePicture', () => {
    it('should update user profile picture', () => {
      const user = userRepository.createUser('testuser', 'hashedpassword');
      const profilePictureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

      userRepository.updateProfilePicture(user.id!, profilePictureData);
      
      const updatedUser = userRepository.findById(user.id!);
      expect(updatedUser?.profilePicture).toBe(profilePictureData);
    });

    it('should overwrite existing profile picture', () => {
      const user = userRepository.createUser('testuser', 'hashedpassword');
      const firstPicture = 'data:image/png;base64,first';
      const secondPicture = 'data:image/png;base64,second';

      userRepository.updateProfilePicture(user.id!, firstPicture);
      userRepository.updateProfilePicture(user.id!, secondPicture);
      
      const updatedUser = userRepository.findById(user.id!);
      expect(updatedUser?.profilePicture).toBe(secondPicture);
    });
  });

  describe('getProfilePicture', () => {
    it('should return profile picture for user', () => {
      const user = userRepository.createUser('testuser', 'hashedpassword');
      const profilePictureData = 'data:image/png;base64,testdata';

      userRepository.updateProfilePicture(user.id!, profilePictureData);
      
      const retrievedPicture = userRepository.getProfilePicture(user.id!);
      expect(retrievedPicture).toBe(profilePictureData);
    });

    it('should return null for user without profile picture', () => {
      const user = userRepository.createUser('testuser', 'hashedpassword');
      
      const retrievedPicture = userRepository.getProfilePicture(user.id!);
      expect(retrievedPicture).toBeNull();
    });

    it('should return null for non-existent user', () => {
      const retrievedPicture = userRepository.getProfilePicture(9999);
      expect(retrievedPicture).toBeNull();
    });
  });

  describe('findByOAuth', () => {
    it('should return user when OAuth provider and id exist', () => {
      userRepository.createOAuthUser({
        username: 'google_user',
        email: 'google@example.com',
        oauthProvider: 'google',
        oauthId: 'google-123',
        profilePicture: 'data:image/png;base64,oauthpic'
      });

      const user = userRepository.findByOAuth('google', 'google-123');

      expect(user).not.toBeNull();
      expect(user?.username).toBe('google_user');
      expect(user?.email).toBe('google@example.com');
      expect(user?.oauthProvider).toBe('google');
      expect(user?.oauthId).toBe('google-123');
      expect(user?.passwordHash).toBeNull();
    });

    it('should return null when OAuth user does not exist', () => {
      const user = userRepository.findByOAuth('google', 'missing-user');
      expect(user).toBeNull();
    });
  });

  describe('createOAuthUser', () => {
    it('should create and return OAuth user', () => {
      const user = userRepository.createOAuthUser({
        username: 'oauth_new',
        email: 'oauth_new@example.com',
        oauthProvider: 'google',
        oauthId: 'google-456',
        profilePicture: null
      });

      expect(user.id).toBeDefined();
      expect(user.username).toBe('oauth_new');
      expect(user.email).toBe('oauth_new@example.com');
      expect(user.oauthProvider).toBe('google');
      expect(user.oauthId).toBe('google-456');
      expect(user.passwordHash).toBeNull();
    });

    it('should throw if OAuth user cannot be read after insert', () => {
      const execSpy = jest.spyOn(db, 'exec').mockReturnValueOnce([] as any);

      expect(() => {
        userRepository.createOAuthUser({
          username: 'oauth_fail',
          email: 'oauth_fail@example.com',
          oauthProvider: 'google',
          oauthId: 'google-789',
          profilePicture: null
        });
      }).toThrow('Failed to create OAuth user');

      execSpy.mockRestore();
    });
  });
});
