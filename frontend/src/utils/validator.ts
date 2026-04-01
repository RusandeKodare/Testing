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

    if (!/[A-Z]/.test(password)) {
      return {
        isValid: false,
        error: 'Password must contain at least 1 uppercase letter'
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        isValid: false,
        error: 'Password must contain at least 1 lowercase letter'
      };
    }

    if (!/\d/.test(password)) {
      return {
        isValid: false,
        error: 'Password must contain at least 1 number'
      };
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
      return {
        isValid: false,
        error: 'Password must contain at least 1 special character (!@#$%^&* etc)'
      };
    }

    return { isValid: true };
  }

  static validatePasswordMatch(password: string, confirmPassword: string): ValidationResult {
    if (password !== confirmPassword) {
      return {
        isValid: false,
        error: 'Passwords do not match'
      };
    }

    return { isValid: true };
  }
}
