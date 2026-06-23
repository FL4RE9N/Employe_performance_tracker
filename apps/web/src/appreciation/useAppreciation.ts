import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, post } from '../lib/api';
import type {
  AppreciationDto,
  CreateAppreciationInput,
} from '@perf-tracker/shared';

// ---- Query keys ----

const APPRECIATION_KEY = ['appreciation'] as const;

// ---- Hooks ----

export function useFeed() {
  return useQuery<AppreciationDto[], Error>({
    queryKey: APPRECIATION_KEY,
    queryFn: () => get<AppreciationDto[]>('/appreciation'),
  });
}

export function useCreateAppreciation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAppreciationInput) =>
      post<AppreciationDto>('/appreciation', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: APPRECIATION_KEY });
    },
  });
}

export function useReact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) =>
      post<void>(`/appreciation/${id}/reactions`, { type }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: APPRECIATION_KEY });
    },
  });
}

export function useUnreact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) =>
      del<void>(`/appreciation/${id}/reactions/${type}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: APPRECIATION_KEY });
    },
  });
}

export function useRemoveAppreciation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<void>(`/appreciation/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: APPRECIATION_KEY });
    },
  });
}
