import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import type { MeetingListItemDto } from '@perf-tracker/shared';

const MEETINGS_KEY = ['meetings'] as const;

export function useMeetings() {
  return useQuery<MeetingListItemDto[], Error>({
    queryKey: MEETINGS_KEY,
    queryFn: () => get<MeetingListItemDto[]>('/meetings'),
  });
}
