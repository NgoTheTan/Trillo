import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import type { StompSubscription } from '@stomp/stompjs';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { NotificationResponse } from './notificationService';
import { useAuth } from '../auth/authContext';
import { getAvatarUrl } from '../auth/authStorage';

function getWebSocketUrl(): string {
  const customWsUrl = import.meta.env.VITE_WS_BASE_URL;
  if (customWsUrl) return customWsUrl;

  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase && apiBase.startsWith('http')) {
    const wsProto = apiBase.startsWith('https') ? 'wss:' : 'ws:';
    const hostPath = apiBase.replace(/^https?:\/\//, '').replace(/\/api\/?$/, '');
    return `${wsProto}//${hostPath}/ws`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Default development fallback: Vite runs on 5173, Spring Boot runs on 8080
  const host = window.location.host.includes(':5173')
    ? window.location.host.replace(':5173', ':8080')
    : window.location.host;
  return `${protocol}//${host}/ws`;
}

class WebSocketService {
  private client: Client | null = null;
  private isConnected = false;
  private notificationCallbacks: Set<(n: NotificationResponse) => void> = new Set();
  private boardCallbacks: Map<string, Set<(e: string) => void>> = new Map();
  private activeSubscriptions: Map<string, StompSubscription> = new Map();
  private connectCallbacks: Set<() => void> = new Set();

  /** Send a message to /app/board/{boardId} — broadcast to all subscribers */
  public sendBoardMessage(boardId: string, payload: string) {
    if (this.client && this.client.connected) {
      try {
        this.client.publish({
          destination: `/app/board/${boardId}`,
          body: payload,
        });
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[WebSocket sendBoardMessage warning]', err);
        }
      }
    }
  }

  public onConnect(callback: () => void): () => void {
    this.connectCallbacks.add(callback);
    if (this.isConnected) {
      try {
        callback();
      } catch (err) {
        console.error('[WebSocket onConnect callback error]', err);
      }
    }
    return () => {
      this.connectCallbacks.delete(callback);
    };
  }

  public connect(token: string) {
    if (this.client?.active) {
      return;
    }

    const brokerURL = getWebSocketUrl();

    this.client = new Client({
      brokerURL,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (msg) => {
        if (import.meta.env.DEV) {
          console.debug('[WebSocket]', msg);
        }
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      this.isConnected = true;
      this.setupGlobalSubscriptions();
      this.connectCallbacks.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.error('[WebSocket connectCallback error]', err);
        }
      });
    };

    this.client.onDisconnect = () => {
      this.isConnected = false;
      this.activeSubscriptions.clear();
    };

    this.client.onStompError = (frame) => {
      console.error('[WebSocket Error]', frame.headers['message'], frame.body);
    };

    this.client.activate();
  }

  public disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.isConnected = false;
      this.activeSubscriptions.clear();
    }
  }

  private setupGlobalSubscriptions() {
    if (!this.client || !this.isConnected) return;

    // Personal notifications channel: /user/queue/notifications
    if (!this.activeSubscriptions.has('notifications')) {
      const sub = this.client.subscribe('/user/queue/notifications', (message) => {
        try {
          const notification: NotificationResponse = JSON.parse(message.body);
          this.notificationCallbacks.forEach((cb) => cb(notification));
        } catch (err) {
          console.error('Failed to parse WebSocket notification', err);
        }
      });
      this.activeSubscriptions.set('notifications', sub);
    }

    // Re-subscribe board channels if any registered callbacks exist
    this.boardCallbacks.forEach((_, boardId) => {
      this.subscribeBoardTopic(boardId);
    });
  }

  private subscribeBoardTopic(boardId: string) {
    const key = `board_${boardId}`;
    if (this.client && this.isConnected && !this.activeSubscriptions.has(key)) {
      const sub = this.client.subscribe(`/topic/board/${boardId}`, (message) => {
        const event = message.body;
        const callbacks = this.boardCallbacks.get(boardId);
        if (callbacks) {
          callbacks.forEach((cb) => cb(event));
        }
      });
      this.activeSubscriptions.set(key, sub);
    }
  }

  public onNotification(callback: (n: NotificationResponse) => void): () => void {
    this.notificationCallbacks.add(callback);
    return () => {
      this.notificationCallbacks.delete(callback);
    };
  }

  public subscribeBoard(boardId: string, callback: (event: string) => void): () => void {
    if (!this.boardCallbacks.has(boardId)) {
      this.boardCallbacks.set(boardId, new Set());
    }
    this.boardCallbacks.get(boardId)!.add(callback);
    this.subscribeBoardTopic(boardId);

    return () => {
      const callbacks = this.boardCallbacks.get(boardId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.boardCallbacks.delete(boardId);
          const key = `board_${boardId}`;
          const sub = this.activeSubscriptions.get(key);
          if (sub) {
            sub.unsubscribe();
            this.activeSubscriptions.delete(key);
          }
        }
      }
    };
  }
}

export const webSocketService = new WebSocketService();

// ── React Hooks ──────────────────────────────────────────────────────────────

export function useWebSocketNotifications() {
  const { user } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const isAuthenticated = !!user && !!token;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isAuthenticated && token) {
      webSocketService.connect(token);

      const unsubscribe = webSocketService.onNotification((notif) => {
        // Show real-time toast alert
        toast(notif.message, {
          icon: notif.type === 'DEADLINE_REMINDER' ? '⏰' : '🔔',
          duration: 5000,
        });

        // Invalidate queries so notifications list and unread count update instantly
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      });

      return () => {
        unsubscribe();
      };
    } else {
      webSocketService.disconnect();
    }
  }, [isAuthenticated, token, queryClient]);
}

export function useWebSocketBoard(boardId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!boardId) return;

    const unsubscribe = webSocketService.subscribeBoard(boardId, (event) => {
      if (import.meta.env.DEV) {
        console.log(`[Board WS Event] ${boardId}:`, event);
      }

      // Route events to refetch active queries immediately
      switch (event) {
        case 'CARD_CREATED':
        case 'CARD_DELETED':
        case 'CARDS_REORDERED':
        case 'CARD_MOVED':
        case 'CARD_UPDATED':
        case 'CARD_STATUS_UPDATED':
          queryClient.refetchQueries({ queryKey: ['board-lists', boardId], type: 'active' });
          queryClient.refetchQueries({ queryKey: ['list-cards'], type: 'active' });
          queryClient.refetchQueries({ queryKey: ['filter-cards', boardId], type: 'active' });
          break;

        case 'LIST_CREATED':
        case 'LIST_DELETED':
        case 'LISTS_REORDERED':
        case 'LIST_UPDATED':
          queryClient.refetchQueries({ queryKey: ['board-lists', boardId], type: 'active' });
          queryClient.refetchQueries({ queryKey: ['boards', boardId], type: 'active' });
          break;

        case 'MEMBER_ADDED':
        case 'MEMBER_REMOVED':
        case 'BOARD_UPDATED':
          queryClient.refetchQueries({ queryKey: ['boards', boardId], type: 'active' });
          queryClient.refetchQueries({ queryKey: ['boards'], type: 'active' });
          break;

        default:
          // Fallback: refetch active queries for this board
          queryClient.refetchQueries({ queryKey: ['boards', boardId], type: 'active' });
          queryClient.refetchQueries({ queryKey: ['board-lists', boardId], type: 'active' });
          queryClient.refetchQueries({ queryKey: ['list-cards'], type: 'active' });
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [boardId, queryClient]);
}

// ── Board Presence (who is viewing right now) ─────────────────────────────────

export interface PresenceUser {
  id: string
  fullName: string
  avatarUrl?: string
  lastSeen?: number
}

const PRESENCE_JOIN_PREFIX = 'PRESENCE_JOIN:';
const PRESENCE_LEAVE_PREFIX = 'PRESENCE_LEAVE:';
const HEARTBEAT_INTERVAL_MS = 8_000; // re-announce every 8s
const PRESENCE_TIMEOUT_MS = 15_000; // mark offline if no heartbeat for 15s

function encodePresencePayload(prefix: string, user: PresenceUser): string {
  return `${prefix}${JSON.stringify({ id: user.id, fullName: user.fullName, avatarUrl: user.avatarUrl ?? '', lastSeen: Date.now() })}`;
}

function decodePresencePayload(raw: string): { prefix: string; user: PresenceUser } | null {
  try {
    const isJoin = raw.startsWith(PRESENCE_JOIN_PREFIX);
    const isLeave = raw.startsWith(PRESENCE_LEAVE_PREFIX);
    if (!isJoin && !isLeave) return null;
    const prefix = isJoin ? PRESENCE_JOIN_PREFIX : PRESENCE_LEAVE_PREFIX;
    const json = raw.slice(prefix.length);
    const user: PresenceUser = JSON.parse(json);
    return { prefix, user: { ...user, lastSeen: Date.now() } };
  } catch {
    return null;
  }
}

/**
 * Tracks who is currently viewing this board (Google Docs-style presence).
 * Returns a list of OTHER users (excluding the current user) who are online.
 */
export function useBoardPresence(boardId: string | undefined): PresenceUser[] {
  const { user: currentUser } = useAuth();
  const [viewers, setViewers] = useState<Map<string, PresenceUser>>(new Map());
  const viewersRef = useRef<Map<string, PresenceUser>>(new Map());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!boardId || !currentUser) return;

    const me: PresenceUser = {
      id: currentUser.id,
      fullName: currentUser.fullName,
      avatarUrl: getAvatarUrl(currentUser.avatarUrl),
    };

    const announceJoin = () => {
      webSocketService.sendBoardMessage(boardId, encodePresencePayload(PRESENCE_JOIN_PREFIX, me));
    };

    // Announce join immediately if connected & register listener for STOMP connection establishment
    announceJoin();
    const unsubConnect = webSocketService.onConnect(announceJoin);
    heartbeatRef.current = setInterval(announceJoin, HEARTBEAT_INTERVAL_MS);

    // Broadcast LEAVE when tab is closing
    const handleBeforeUnload = () => {
      webSocketService.sendBoardMessage(boardId, encodePresencePayload(PRESENCE_LEAVE_PREFIX, me));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Stale presence auto-cleanup (evict viewers inactive for > 15s)
    cleanupTimerRef.current = setInterval(() => {
      const now = Date.now();
      let changed = false;
      const next = new Map(viewersRef.current);
      next.forEach((v, id) => {
        if (v.lastSeen && now - v.lastSeen > PRESENCE_TIMEOUT_MS) {
          next.delete(id);
          changed = true;
        }
      });
      if (changed) {
        viewersRef.current = next;
        setViewers(next);
      }
    }, 4_000);

    // Subscribe to board topic to catch presence events
    const unsubscribe = webSocketService.subscribeBoard(boardId, (event: string) => {
      const decoded = decodePresencePayload(event);
      if (!decoded) return;

      const { prefix, user } = decoded;

      // Ignore our own presence echoes
      if (user.id === currentUser.id) return;

      if (prefix === PRESENCE_JOIN_PREFIX) {
        const isNew = !viewersRef.current.has(user.id);
        const next = new Map(viewersRef.current);
        next.set(user.id, user);
        viewersRef.current = next;
        setViewers(next);

        // If a new/reloaded viewer joins, respond with presence back immediately
        if (isNew) {
          announceJoin();
        }
      } else if (prefix === PRESENCE_LEAVE_PREFIX) {
        const next = new Map(viewersRef.current);
        next.delete(user.id);
        viewersRef.current = next;
        setViewers(next);
      }
    });

    return () => {
      webSocketService.sendBoardMessage(boardId, encodePresencePayload(PRESENCE_LEAVE_PREFIX, me));
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (cleanupTimerRef.current) clearInterval(cleanupTimerRef.current);
      unsubConnect();
      unsubscribe();
      viewersRef.current = new Map();
      setViewers(new Map());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, currentUser?.id]);

  return Array.from(viewers.values());
}
