import { apiClient } from './client';

/**
 * Campaign-related API calls.
 *
 * The backend stores campaigns in the same denormalised shape the
 * frontend's `CampaignContext` consumes (chapters, characters, members,
 * annotations and the events graph + tactical map are all embedded).
 * The shape returned here matches the `Campaign` type in
 * `context/CampaignContext` so consumers can pass it through unchanged.
 */

export interface CampaignDTO {
  id: string;
  name: string;
  templateId?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  chapters: Array<{
    id: string;
    title: string;
    events: {
      blocks: Array<{
        id: string;
        x: number;
        y: number;
        text: string;
        type: string;
      }>;
      connections: Array<{ id: string; from: string; to: string }>;
    };
    map: {
      cells: Record<string, { category: string; subtype: string }>;
      cols: number;
      rows: number;
    };
  }>;
  characters: Array<Record<string, unknown>>;
  members: Array<{
    userId: string;
    role: 'dm' | 'co-dm' | 'player';
    characterId?: string;
    joinedAt: string;
  }>;
  annotations: Array<{
    id: string;
    userId: string;
    targetType: 'character' | 'chapter';
    targetId: string;
    text: string;
    createdAt: string;
  }>;
  revealedSpoilers: string[];
  shareToken?: string;
  viewToken?: string;
  image?: string;
  visibility: 'public' | 'private';
  /** Only present in public-listing endpoints. */
  ownerProfile?: {
    id: string;
    username: string;
    avatar?: string;
  } | null;
}

export const campaignsApi = {
  async list(): Promise<CampaignDTO[]> {
    const data = await apiClient.get<{ campaigns: CampaignDTO[] }>('/campaigns');
    return data.campaigns;
  },

  async getById(id: string): Promise<CampaignDTO> {
    const data = await apiClient.get<{ campaign: CampaignDTO }>(`/campaigns/${id}`);
    return data.campaign;
  },

  async listPublic(): Promise<CampaignDTO[]> {
    const data = await apiClient.get<{ campaigns: CampaignDTO[] }>(
      '/campaigns/public'
    );
    return data.campaigns;
  },

  async create(input: {
    name: string;
    templateId?: string;
    image?: string;
    visibility?: 'public' | 'private';
    chapters?: CampaignDTO['chapters'];
    characters?: CampaignDTO['characters'];
  }): Promise<CampaignDTO> {
    const data = await apiClient.post<{ campaign: CampaignDTO }>(
      '/campaigns',
      input
    );
    return data.campaign;
  },

  async update(
    id: string,
    patch: Partial<Omit<CampaignDTO, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>
  ): Promise<CampaignDTO> {
    const data = await apiClient.put<{ campaign: CampaignDTO }>(
      `/campaigns/${id}`,
      patch
    );
    return data.campaign;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete<void>(`/campaigns/${id}`);
  },

  async clone(id: string): Promise<CampaignDTO> {
    const data = await apiClient.post<{ campaign: CampaignDTO }>(
      `/campaigns/${id}/clone`
    );
    return data.campaign;
  },

  // --- Tokens -----------------------------------------------------------
  async generateShareToken(id: string): Promise<string> {
    const data = await apiClient.post<{ shareToken: string }>(
      `/campaigns/${id}/share-token`
    );
    return data.shareToken;
  },

  async revokeShareToken(id: string): Promise<void> {
    await apiClient.delete<void>(`/campaigns/${id}/share-token`);
  },

  async generateViewToken(id: string): Promise<string> {
    const data = await apiClient.post<{ viewToken: string }>(
      `/campaigns/${id}/view-token`
    );
    return data.viewToken;
  },

  async revokeViewToken(id: string): Promise<void> {
    await apiClient.delete<void>(`/campaigns/${id}/view-token`);
  },

  async getByShareToken(token: string): Promise<CampaignDTO> {
    const data = await apiClient.get<{ campaign: CampaignDTO }>(
      `/campaigns/by-share-token/${token}`
    );
    return data.campaign;
  },

  async getByViewToken(token: string): Promise<CampaignDTO> {
    const data = await apiClient.get<{ campaign: CampaignDTO }>(
      `/campaigns/by-view-token/${token}`
    );
    return data.campaign;
  },

  async acceptInvite(token: string): Promise<CampaignDTO> {
    const data = await apiClient.post<{ campaign: CampaignDTO }>(
      `/campaigns/by-share-token/${token}/join`
    );
    return data.campaign;
  },

  // --- Members ----------------------------------------------------------
  async addMember(
    id: string,
    input: { userId: string; role?: 'dm' | 'co-dm' | 'player'; characterId?: string }
  ): Promise<CampaignDTO> {
    const data = await apiClient.post<{ campaign: CampaignDTO }>(
      `/campaigns/${id}/members`,
      input
    );
    return data.campaign;
  },

  async updateMember(
    id: string,
    userId: string,
    patch: { role?: 'dm' | 'co-dm' | 'player'; characterId?: string | null }
  ): Promise<CampaignDTO> {
    const data = await apiClient.put<{ campaign: CampaignDTO }>(
      `/campaigns/${id}/members/${userId}`,
      patch
    );
    return data.campaign;
  },

  async removeMember(id: string, userId: string): Promise<CampaignDTO> {
    const data = await apiClient.delete<{ campaign: CampaignDTO }>(
      `/campaigns/${id}/members/${userId}`
    );
    return data.campaign;
  },
};
