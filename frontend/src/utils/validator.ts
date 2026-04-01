export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class Validator {
  static validateUsername(username: string): ValidationResult {
    if (!username || username.trim().length === 0) {
      return {
        isValid: false,
        error: 'Username is required'
      };
    }

    if (username.length < 3) {
      return {
        isValid: false,
        error: 'Username must be at least 3 characters'
      };
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return {
        isValid: false,
        error: 'Username must be alphanumeric only'
      };
    }

    return { isValid: true };
  }

  static validatePassword(password: string): ValidationResult {
    if (!password || password.length === 0) {
      return {
        isValid: false,
        error: 'Password is required'
      };
    }

    if (password.length < 8) {
      return {
        isValid: false,
        error: 'Password must be at least 8 characters'
      };
    }

    if (!/\d/.test(password)) {
      return {
        isValid: false,
        error: 'Password must contain at least 1 number'
      };
    }

    return { isValid: true };
  }
}
