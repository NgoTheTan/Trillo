import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import type { StompSubscription } from '@stomp/stompjs';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { NotificationResponse } from './notificationService';
import { useAuth } from '../auth/authContext';

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

      // Route events to only invalidate relevant queries
      switch (event) {
        case 'CARD_CREATED':
        case 'CARD_DELETED':
        case 'CARDS_REORDERED':
          queryClient.invalidateQueries({ queryKey: ['board-lists', boardId] });
          queryClient.invalidateQueries({ queryKey: ['list-cards'] });
          queryClient.invalidateQueries({ queryKey: ['filter-cards', boardId] });
          break;

        case 'CARD_MOVED':
          queryClient.invalidateQueries({ queryKey: ['list-cards'] });
          queryClient.invalidateQueries({ queryKey: ['filter-cards', boardId] });
          break;

        case 'CARD_UPDATED':
        case 'CARD_STATUS_UPDATED':
          queryClient.invalidateQueries({ queryKey: ['list-cards'] });
          queryClient.invalidateQueries({ queryKey: ['filter-cards', boardId] });
          break;

        case 'LIST_CREATED':
        case 'LIST_DELETED':
        case 'LISTS_REORDERED':
          queryClient.invalidateQueries({ queryKey: ['board-lists', boardId] });
          queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
          break;

        case 'LIST_UPDATED':
          queryClient.invalidateQueries({ queryKey: ['board-lists', boardId] });
          break;

        case 'MEMBER_ADDED':
        case 'MEMBER_REMOVED':
        case 'BOARD_UPDATED':
          queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
          queryClient.invalidateQueries({ queryKey: ['boards'] });
          break;

        default:
          // Fallback: invalidate everything for this board
          queryClient.invalidateQueries({ queryKey: ['boards', boardId] });
          queryClient.invalidateQueries({ queryKey: ['board-lists', boardId] });
          queryClient.invalidateQueries({ queryKey: ['list-cards'] });
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [boardId, queryClient]);
}

