import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api';
import type {
  AdminUserDto,
  CreatePairingInput,
  CreateUserInput,
  DirectoryUserDto,
  PairingDto,
  UpdateUserInput,
} from '@perf-tracker/shared';

// ---- Query keys ----

const USERS_KEY = ['admin', 'users'] as const;
const PAIRINGS_KEY = ['admin', 'pairings'] as const;
const DIRECTORY_KEY = ['directory'] as const;

// ---- Users ----

export function useUsers() {
  return useQuery<AdminUserDto[], Error>({
    queryKey: USERS_KEY,
    queryFn: () => get<AdminUserDto[]>('/admin/users'),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserInput) =>
      post<AdminUserDto>('/admin/users', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USERS_KEY });
      void queryClient.invalidateQueries({ queryKey: DIRECTORY_KEY });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      patch<AdminUserDto>(`/admin/users/${id}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USERS_KEY });
      void queryClient.invalidateQueries({ queryKey: DIRECTORY_KEY });
    },
  });
}

// ---- Pairings ----

export function usePairings() {
  return useQuery<PairingDto[], Error>({
    queryKey: PAIRINGS_KEY,
    queryFn: () => get<PairingDto[]>('/admin/pairings'),
  });
}

export function useCreatePairing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePairingInput) =>
      post<PairingDto>('/admin/pairings', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PAIRINGS_KEY });
    },
  });
}

export function useClosePairing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<void>(`/admin/pairings/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PAIRINGS_KEY });
    },
  });
}

// ---- Directory ----

export function useDirectory() {
  return useQuery<DirectoryUserDto[], Error>({
    queryKey: DIRECTORY_KEY,
    queryFn: () => get<DirectoryUserDto[]>('/directory'),
  });
}
