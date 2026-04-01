import { User, UserCredentials } from '../../../src/models/User';

describe('User Model', () => {
  describe('User interface', () => {
    it('should accept valid user object', () => {
      const user: User = {
        id: 1,
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date()
      };

      expect(user.id).toBe(1);
      expect(user.username).toBe('testuser');
      expect(user.passwordHash).toBe('hashedpassword123');
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should accept user without optional fields', () => {
      const user: User = {
        username: 'testuser',
        passwordHash: 'hashedpassword123'
      };

      expect(user.username).toBe('testuser');
      expect(user.passwordHash).toBe('hashedpassword123');
      expect(user.id).toBeUndefined();
      expect(user.createdAt).toBeUndefined();
    });
  });

  describe('UserCredentials interface', () => {
    it('should accept valid credentials', () => {
      const credentials: UserCredentials = {
        username: 'testuser',
        password: 'password123'
      };

      expect(credentials.username).toBe('testuser');
      expect(credentials.password).toBe('password123');
    });
  });
});
