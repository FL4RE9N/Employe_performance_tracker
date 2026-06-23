import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from '../lib/api';
import type { NotificationDto, NotificationPreferenceDto, UpdatePreferenceInput } from '@perf-tracker/shared';

// ---- Query keys ----

export const NOTIFICATIONS_KEY = ['notifications'] as const;
export const NOTIFICATIONS_UNREAD_KEY = ['notifications', 'unread'] as const;
export const NOTIFICATIONS_PREFS_KEY = ['notifications', 'preferences'] as const;

// ---- Types ----

export interface NotificationsResponse {
  items: NotificationDto[];
  unreadCount: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

// ---- Hooks ----

export function useNotifications() {
  return useQuery<NotificationsResponse, Error>({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => get<NotificationsResponse>('/notifications'),
  });
}

export function useUnreadCount() {
  return useQuery<UnreadCountResponse, Error>({
    queryKey: NOTIFICATIONS_UNREAD_KEY,
    queryFn: () => get<UnreadCountResponse>('/notifications/unread-count'),
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patch<{ ok: true }>(`/notifications/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_KEY });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => post<{ updated: number }>('/notifications/read-all'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_KEY });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreferenceDto, Error>({
    queryKey: NOTIFICATIONS_PREFS_KEY,
    queryFn: () => get<NotificationPreferenceDto>('/notifications/preferences'),
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePreferenceInput) =>
      patch<NotificationPreferenceDto>('/notifications/preferences', data),
    onSuccess: (updated) => {
      queryClient.setQueryData(NOTIFICATIONS_PREFS_KEY, updated);
    },
  });
}
