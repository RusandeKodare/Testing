export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    username: string;
  };
}

export interface UserCredentials {
  username: string;
  password: string;
  confirmPassword?: string;
}

export class AuthApiService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000/api/auth') {
    this.baseUrl = baseUrl;
  }

  async register(credentials: UserCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials),
      credentials: 'include'
    });

    return await response.json();
  }

  async login(credentials: UserCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials),
      credentials: 'include'
    });

    return await response.json();
  }
}
