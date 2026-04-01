export interface User {
  id?: number;
  username: string;
  passwordHash: string;
  createdAt?: Date;
  loginAttempts?: number;
  lockedUntil?: Date | null;
}

export interface UserCredentials {
  username: string;
  password: string;
  confirmPassword?: string;
}
