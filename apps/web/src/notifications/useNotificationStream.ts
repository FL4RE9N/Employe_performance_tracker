import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/useSession';
import type { NotificationDto } from '@perf-tracker/shared';
import {
  NOTIFICATIONS_KEY,
  NOTIFICATIONS_UNREAD_KEY,
  type NotificationsResponse,
  type UnreadCountResponse,
} from './useNotifications';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export function useNotificationStream() {
  const { data: user } = useSession();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    const es = new EventSource(`${API_BASE}/notifications/stream`, {
      withCredentials: true,
    });

    es.onmessage = (event: MessageEvent<string>) => {
      let notification: NotificationDto;
      try {
        notification = JSON.parse(event.data) as NotificationDto;
      } catch {
        return;
      }

      // Optimistically prepend to the notifications list (de-dupe by id)
      queryClient.setQueryData<NotificationsResponse>(NOTIFICATIONS_KEY, (prev) => {
        if (!prev) return prev;
        const exists = prev.items.some((n) => n.id === notification.id);
        if (exists) return prev;
        const isUnread = notification.status === 'unread';
        return {
          items: [notification, ...prev.items],
          unreadCount: isUnread ? prev.unreadCount + 1 : prev.unreadCount,
        };
      });

      // Also update the unread-count cache
      if (notification.status === 'unread') {
        queryClient.setQueryData<UnreadCountResponse>(NOTIFICATIONS_UNREAD_KEY, (prev) => {
          if (!prev) return { unreadCount: 1 };
          return { unreadCount: prev.unreadCount + 1 };
        });
      }

      // Debounce a full invalidation to reconcile with server state
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
        void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_KEY });
      }, 2000);
    };

    // On error: EventSource will auto-reconnect; do not throw
    es.onerror = () => {
      // intentionally left empty — EventSource handles reconnect
    };

    return () => {
      es.close();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user, queryClient]);
}
