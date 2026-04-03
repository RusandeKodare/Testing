import { getCsrfTokenFromCookie } from '../utils/csrf.js';

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000/api/diary`;

export interface DiaryEntryDto {
  id: number;
  userId: number;
  title: string;
  content: string;
  mood: string | null;
  tags: string[];
  isFavorite: boolean;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryListResponse {
  success: boolean;
  entries: DiaryEntryDto[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
  message?: string;
}

export interface DiaryMutationResponse {
  success: boolean;
  entry?: DiaryEntryDto;
  message?: string;
}

export interface DiarySingleResponse {
  success: boolean;
  entry?: DiaryEntryDto;
  message?: string;
}

export class DiaryApiService {
  async listEntries(query: Record<string, string | undefined> = {}): Promise<DiaryListResponse> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 0) {
        params.set(key, value);
      }
    });

    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/entries${suffix}`, {
      credentials: 'include'
    });

    return response.json();
  }

  async createEntry(payload: Record<string, unknown>): Promise<DiaryMutationResponse> {
    const response = await fetch(`${API_BASE_URL}/entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfTokenFromCookie()
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  async updateEntry(entryId: number, payload: Record<string, unknown>): Promise<DiaryMutationResponse> {
    const response = await fetch(`${API_BASE_URL}/entries/${entryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfTokenFromCookie()
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  async getEntry(entryId: number): Promise<DiarySingleResponse> {
    const response = await fetch(`${API_BASE_URL}/entries/${entryId}`, {
      credentials: 'include'
    });

    return response.json();
  }

  async deleteEntry(entryId: number): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/entries/${entryId}`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': getCsrfTokenFromCookie()
      },
      credentials: 'include'
    });

    return response.json();
  }
}
