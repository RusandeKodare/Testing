export interface User {
  id?: number;
  username: string;
  passwordHash: string;
  createdAt?: Date;
}

export interface UserCredentials {
  username: string;
  password: string;
}
