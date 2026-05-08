/**
 * Public surface of the API layer.
 *
 * Importing from `../api` (this barrel) keeps the rest of the codebase
 * decoupled from the underlying transport (`fetch` today, possibly
 * something else tomorrow). All API functions return Promises and throw
 * an `ApiError` on non-2xx responses.
 */
export { apiClient, ApiError, setTokens, clearTokens, hasTokens, apiBaseUrl } from './client';
export type { ApiResponse, ApiErrorBody } from './client';
export { authApi } from './auth';
export type { BackendUser, RegisterInput, LoginInput } from './auth';
export { followsApi } from './follows';
export { campaignsApi } from './campaigns';
export type { CampaignDTO } from './campaigns';
export {
  getSocket,
  closeSocket,
  SocketEvents,
} from './socket';
export type {
  MapUpdatePayload,
  CombatUpdatePayload,
  VisibilityChangedPayload,
} from './socket';
