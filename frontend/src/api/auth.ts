import { apiClient, setTokens, clearTokens } from './client';

/**
 * Auth-related API calls.
 *
 * Each function returns a Promise that resolves to the unwrapped `data`
 * payload (the `{ success, data }` envelope is unwrapped by `apiClient`).
 */

export interface BackendUser {
  _id: string;
  username: string;
  email: string;
  avatar?: string | null;
  description?: string;
  isPrivate?: boolean;
  role?: 'user' | 'admin';
  createdAt?: string;
  updatedAt?: string;
}

interface AuthResult {
  user: BackendUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  /** Either a username or an email. */
  identifier: string;
  password: string;
}

export const authApi = {
  async register(input: RegisterInput): Promise<BackendUser> {
    const data = await apiClient.post<AuthResult>('/auth/register', input, {
      auth: false,
    });
    setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return data.user;
  },

  async login(input: LoginInput): Promise<BackendUser> {
    const data = await apiClient.post<AuthResult>('/auth/login', input, {
      auth: false,
    });
    setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post<void>('/auth/logout');
    } finally {
      clearTokens();
    }
  },

  async me(): Promise<BackendUser> {
    const data = await apiClient.get<{ user: BackendUser }>('/auth/me');
    return data.user;
  },

  async updateProfile(patch: {
    username?: string;
    avatar?: string | null;
    description?: string;
    isPrivate?: boolean;
  }): Promise<BackendUser> {
    const data = await apiClient.put<{ user: BackendUser }>('/auth/me', patch);
    return data.user;
  },

  async changePassword(input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    const data = await apiClient.put<{ accessToken: string; refreshToken: string }>(
      '/auth/change-password',
      input
    );
    setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
  },

  async deleteAccount(password: string): Promise<void> {
    await apiClient.delete<void>('/auth/account');
    clearTokens();
    void password;
  },

  async searchUsers(query: string): Promise<BackendUser[]> {
    if (!query || query.length < 2) return [];
    const data = await apiClient.get<{ users: BackendUser[] }>(
      '/auth/users/search',
      { query: { q: query } }
    );
    return data.users;
  },

  async getPublicProfile(id: string): Promise<BackendUser> {
    const data = await apiClient.get<{ user: BackendUser }>(`/auth/users/${id}`);
    return data.user;
  },
};
