import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Api } from "../api/api";

export type NotificationType =
  | 'BOARD_INVITE'
  | 'CARD_ASSIGNED'
  | 'DEADLINE_REMINDER'
  | 'CARD_UPDATED'
  | 'COMMENT_ADDED'
  | 'MEMBER_JOINED';

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  referenceId?: string;
  referenceType?: 'BOARD' | 'CARD' | string;
  read: boolean;
  createdAt: string;
}

// ── API Functions ────────────────────────────────────────────────────────────

export const getAllNotifications = async (): Promise<NotificationResponse[]> => {
  return await Api.get<NotificationResponse[]>("/notifications");
};

export const getUnreadNotifications = async (): Promise<NotificationResponse[]> => {
  return await Api.get<NotificationResponse[]>("/notifications/unread");
};

export const getUnreadCount = async (): Promise<number> => {
  const res = await Api.get<{ count: number }>("/notifications/unread/count");
  return res.count;
};

export const markNotificationAsRead = async (id: string): Promise<NotificationResponse> => {
  return await Api.patch<NotificationResponse>(`/notifications/${id}/read`);
};

export const markNotificationAsUnread = async (id: string): Promise<NotificationResponse> => {
  return await Api.patch<NotificationResponse>(`/notifications/${id}/unread`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await Api.patch<void>("/notifications/read-all");
};

// ── React Query Hooks ────────────────────────────────────────────────────────

export const useNotificationsQuery = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: getAllNotifications,
    staleTime: 0,              // Always refetch when invalidated by WebSocket
    refetchInterval: 30_000,   // Fallback polling every 30s in case WS drops
    refetchIntervalInBackground: false,
  });
};

export const useUnreadCountQuery = () => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
  });
};

export const useMarkReadMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkUnreadMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationAsUnread(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllReadMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
