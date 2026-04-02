import { Validator } from '../../../src/utils/validator';

describe('Validator', () => {
  describe('validateUsername', () => {
    it('should return valid for correct username', () => {
      const result = Validator.validateUsername('testuser');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty username', () => {
      const result = Validator.validateUsername('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username is required');
    });

    it('should reject whitespace-only username', () => {
      const result = Validator.validateUsername('   ');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username is required');
    });

    it('should reject username shorter than 3 characters', () => {
      const result = Validator.validateUsername('ab');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username must be at least 3 characters');
    });

    it('should reject username with special characters', () => {
      const result = Validator.validateUsername('test@user');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username must be alphanumeric only');
    });

    it('should reject username with spaces', () => {
      const result = Validator.validateUsername('test user');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username must be alphanumeric only');
    });

    it('should accept alphanumeric username', () => {
      const result = Validator.validateUsername('user123');

      expect(result.isValid).toBe(true);
    });

    it('should accept exactly 3 characters', () => {
      const result = Validator.validateUsername('abc');

      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should return valid for correct password', () => {
      const result = Validator.validatePassword('SecurePassword123!');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty password', () => {
      const result = Validator.validatePassword('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    it('should reject password shorter than 8 characters', () => {
      const result = Validator.validatePassword('pass1');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters');
    });

    it('should reject password without number', () => {
      const result = Validator.validatePassword('Password!');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least 1 number');
    });

    it('should reject password without uppercase letter', () => {
      const result = Validator.validatePassword('password123!');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least 1 uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = Validator.validatePassword('PASSWORD123!');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least 1 lowercase letter');
    });

    it('should reject password without special character', () => {
      const result = Validator.validatePassword('Password123');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least 1 special character (!@#$%^&* etc)');
    });

    it('should accept password with exactly 8 characters and all requirements', () => {
      const result = Validator.validatePassword('Pass@123');

      expect(result.isValid).toBe(true);
    });

    it('should accept password with all requirements', () => {
      const result = Validator.validatePassword('Password123!');

      expect(result.isValid).toBe(true);
    });

    it('should accept password with special characters and numbers', () => {
      const result = Validator.validatePassword('P@ssw0rd!');

      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePasswordMatch', () => {
    it('should return valid when passwords match', () => {
      const result = Validator.validatePasswordMatch('Password123!', 'Password123!');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject when passwords do not match', () => {
      const result = Validator.validatePasswordMatch('Password123!', 'Different123!');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Passwords do not match');
    });

    it('should reject when passwords differ in case', () => {
      const result = Validator.validatePasswordMatch('Password123!', 'password123!');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Passwords do not match');
    });

    it('should reject empty password confirmation', () => {
      const result = Validator.validatePasswordMatch('Password123!', '');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Passwords do not match');
    });
  });
});
