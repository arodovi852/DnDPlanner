import { useEffect, useRef } from 'react';
import {
  getSocket,
  SocketEvents,
  type MapUpdatePayload,
  type CombatUpdatePayload,
  type VisibilityChangedPayload,
} from '../api';

/**
 * useCampaignSocket
 *
 * React hook that joins a Socket.IO room for the given `campaignId` and
 * dispatches incoming events to caller-provided handlers. The socket
 * connection is shared across the app via `getSocket()`, so the only
 * thing this hook does is:
 *   1. emit `join:campaign` on mount,
 *   2. wire up listeners and unsubscribe on unmount,
 *   3. emit `leave:campaign` on unmount.
 *
 * Each handler is captured in a ref so callers can safely pass inline
 * functions without forcing the listeners to re-subscribe on every
 * render.
 */
interface CampaignSocketHandlers {
  onMapUpdated?: (payload: MapUpdatePayload) => void;
  onCombatUpdated?: (payload: CombatUpdatePayload) => void;
  onVisibilityChanged?: (payload: VisibilityChangedPayload) => void;
  /** Called when the socket connects (initial or after reconnect). */
  onConnect?: () => void;
  /** Called when the socket disconnects (transport or server side). */
  onDisconnect?: () => void;
}

export function useCampaignSocket(
  campaignId: string | null | undefined,
  handlers: CampaignSocketHandlers
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!campaignId) return;
    const socket = getSocket();

    // Stable listener fns that read from the ref so callers can pass
    // freshly-allocated callbacks without re-binding listeners.
    const onMap = (p: MapUpdatePayload) => handlersRef.current.onMapUpdated?.(p);
    const onCombat = (p: CombatUpdatePayload) =>
      handlersRef.current.onCombatUpdated?.(p);
    const onVis = (p: VisibilityChangedPayload) =>
      handlersRef.current.onVisibilityChanged?.(p);
    const onConnect = () => handlersRef.current.onConnect?.();
    const onDisconnect = () => handlersRef.current.onDisconnect?.();

    socket.on(SocketEvents.mapUpdated, onMap);
    socket.on(SocketEvents.combatUpdated, onCombat);
    socket.on(SocketEvents.visibilityChanged, onVis);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.emit(SocketEvents.joinCampaign, campaignId);

    return () => {
      socket.emit(SocketEvents.leaveCampaign, campaignId);
      socket.off(SocketEvents.mapUpdated, onMap);
      socket.off(SocketEvents.combatUpdated, onCombat);
      socket.off(SocketEvents.visibilityChanged, onVis);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [campaignId]);
}
