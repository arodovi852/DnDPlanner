import { apiClient } from './client';
import type { BackendUser } from './auth';

/**
 * Follow-related API calls.
 *
 * Mirrors the backend `/follows/*` routes. The follow/unfollow endpoints
 * are idempotent: requesting the same edge twice is a no-op.
 */

export const followsApi = {
  async getFollowing(userId?: string): Promise<BackendUser[]> {
    const data = await apiClient.get<{ users: BackendUser[] }>(
      '/follows/me/following',
      { query: userId ? { userId } : undefined }
    );
    return data.users;
  },

  async getFollowers(userId?: string): Promise<BackendUser[]> {
    const data = await apiClient.get<{ users: BackendUser[] }>(
      '/follows/me/followers',
      { query: userId ? { userId } : undefined }
    );
    return data.users;
  },

  async follow(targetId: string): Promise<void> {
    await apiClient.post<void>(`/follows/${targetId}`);
  },

  async unfollow(targetId: string): Promise<void> {
    await apiClient.delete<void>(`/follows/${targetId}`);
  },
};
