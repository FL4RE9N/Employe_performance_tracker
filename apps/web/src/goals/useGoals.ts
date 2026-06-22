import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, patch, post } from '../lib/api';
import type {
  CreateGoalInput,
  UpdateGoalInput,
  GoalDto,
  GoalScope,
} from '@perf-tracker/shared';

// ---- Query keys ----

const GOALS_KEY = ['goals'] as const;

function goalsKey(scope?: GoalScope) {
  return scope ? [...GOALS_KEY, scope] : GOALS_KEY;
}

// ---- Hooks ----

export function useGoals(scope?: GoalScope) {
  const as = scope ?? 'mine';
  return useQuery<GoalDto[], Error>({
    queryKey: goalsKey(as),
    queryFn: () => get<GoalDto[]>(`/goals?as=${as}`),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGoalInput) => post<GoalDto>('/goals', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GOALS_KEY });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoalInput }) =>
      patch<GoalDto>(`/goals/${id}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GOALS_KEY });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<void>(`/goals/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GOALS_KEY });
    },
  });
}
