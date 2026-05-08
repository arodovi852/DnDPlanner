import { io, Socket } from 'socket.io-client';
import { apiBaseUrl } from './client';

/**
 * Socket.IO client singleton.
 *
 * The backend exposes Socket.IO at the root path (same host/port as the
 * REST API, but without the `/api` prefix used by HTTP routes). We
 * derive the WebSocket URL from `VITE_API_URL` by stripping that suffix
 * so a single env var configures both transports.
 *
 * Connection is lazy: callers receive a singleton via `getSocket()` and
 * the underlying connection is opened on first use. Disconnect is
 * triggered explicitly on logout via `closeSocket()`.
 */

function deriveSocketUrl(): string {
  // apiBaseUrl looks like 'http://localhost:3000/api' or '/api'.
  // Strip the trailing '/api' so socket.io-client connects to the host root.
  const trimmed = apiBaseUrl.replace(/\/api\/?$/, '');
  if (!trimmed || trimmed === apiBaseUrl) {
    // Fell through (apiBaseUrl didn't end in /api) — assume same origin.
    if (typeof window !== 'undefined') return window.location.origin;
    return 'http://localhost:3000';
  }
  // If we ended up with a relative path, resolve against current origin.
  if (trimmed.startsWith('/') || trimmed === '') {
    if (typeof window !== 'undefined') return window.location.origin;
    return 'http://localhost:3000';
  }
  return trimmed;
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (!socket) {
    socket = io(deriveSocketUrl(), {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      withCredentials: true,
      // Reconnect aggressively on transient disconnects so live edits
      // resume without user action.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });
  } else if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

// ---------------------------------------------------------------------------
// Typed event helpers
// ---------------------------------------------------------------------------

export interface MapUpdatePayload {
  campaignId: string;
  chapterId: string;
  map: {
    cells: Record<string, { category: string; subtype: string }>;
    cols: number;
    rows: number;
  };
  /** Optional fingerprint of the emitter so we can skip our own echoes. */
  origin?: string;
}

export interface CombatUpdatePayload {
  campaignId: string;
  chapterId: string;
  characterId: string;
  patch: Record<string, unknown>;
  origin?: string;
}

export interface VisibilityChangedPayload {
  campaignId: string;
  visibility: 'public' | 'private';
  origin?: string;
}

export const SocketEvents = {
  joinCampaign: 'join:campaign',
  leaveCampaign: 'leave:campaign',
  mapUpdate: 'map:update',
  mapUpdated: 'map:updated',
  combatUpdate: 'combat:update',
  combatUpdated: 'combat:updated',
  visibilityToggle: 'visibility:toggle',
  visibilityChanged: 'visibility:changed',
} as const;
