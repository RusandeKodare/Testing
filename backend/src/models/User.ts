export interface User {
  id?: number;
  username: string | null;
  passwordHash: string | null;
  profilePicture?: string | null;
  email?: string | null;
  oauthProvider?: 'google' | 'github' | null;
  oauthId?: string | null;
  createdAt?: Date;
  loginAttempts?: number;
  lockedUntil?: Date | null;
}

export interface UserCredentials {
  username: string;
  password: string;
  confirmPassword?: string;
}
