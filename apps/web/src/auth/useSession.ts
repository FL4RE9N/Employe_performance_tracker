import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { get, post, UnauthorizedError } from '../lib/api';
import type { SessionUser, LoginInput } from '@perf-tracker/shared';

export function useSession() {
  return useQuery<SessionUser, Error>({
    queryKey: ['me'],
    queryFn: () => get<SessionUser>('/auth/me'),
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (credentials: LoginInput) => {
      // POST /auth/login responds with an envelope: { user: SessionUser }
      const res = await post<{ user: SessionUser }>('/auth/login', credentials);
      return res.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
      navigate('/');
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => post('/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(['me'], null);
      queryClient.removeQueries({ queryKey: ['me'] });
      navigate('/login');
    },
    onError: (err) => {
      // Even if logout fails server-side, clear local state
      if (err instanceof UnauthorizedError) {
        queryClient.setQueryData(['me'], null);
        navigate('/login');
      }
    },
  });
}
