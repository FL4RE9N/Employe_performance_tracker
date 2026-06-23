import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '../lib/api';
import { useDirectory as useAdminDirectory } from '../admin/useAdminUsers';
import type {
  CycleDto,
  CreateCycleInput,
  LaunchOrgWideInput,
  TransitionInput,
  AcknowledgeInput,
  SaveDraftInput,
  SubmitReviewInput,
  ReviewSubmissionDto,
  ComparisonDto,
} from '@perf-tracker/shared';

// ---- Query keys ----

const CYCLES_KEY = ['cycles'] as const;

function cycleKey(id: string) {
  return ['cycle', id] as const;
}

function submissionKey(id: string, side: 'self' | 'mentor') {
  return ['submission', id, side] as const;
}

function comparisonKey(id: string) {
  return ['comparison', id] as const;
}

function releasedReviewKey(id: string) {
  return ['releasedReview', id] as const;
}

// ---- Queries ----

export function useCycles(scope?: 'mine' | 'mentee' | 'all') {
  const as = scope ?? 'mine';
  return useQuery<CycleDto[], Error>({
    queryKey: [...CYCLES_KEY, as],
    queryFn: () => get<CycleDto[]>(`/cycles?as=${as}`),
  });
}

export function useCycle(id: string) {
  return useQuery<CycleDto, Error>({
    queryKey: cycleKey(id),
    queryFn: () => get<CycleDto>(`/cycles/${id}`),
    enabled: !!id,
  });
}

export function useSubmission(id: string, side: 'self' | 'mentor') {
  return useQuery<ReviewSubmissionDto, Error>({
    queryKey: submissionKey(id, side),
    queryFn: () => get<ReviewSubmissionDto>(`/cycles/${id}/submissions/${side}`),
    enabled: !!id,
    retry: (failureCount, error) => {
      // Do not retry 403 errors — submission is simply not accessible
      if (error && 'status' in error && (error as { status: number }).status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useComparison(id: string, enabled = true) {
  return useQuery<ComparisonDto, Error>({
    queryKey: comparisonKey(id),
    queryFn: () => get<ComparisonDto>(`/cycles/${id}/comparison`),
    enabled: !!id && enabled,
    retry: (failureCount, error) => {
      if (error && 'status' in error && (error as { status: number }).status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useReleasedReview(id: string, enabled = true) {
  return useQuery<ComparisonDto, Error>({
    queryKey: releasedReviewKey(id),
    queryFn: () => get<ComparisonDto>(`/cycles/${id}/released-review`),
    enabled: !!id && enabled,
    retry: (failureCount, error) => {
      if (error && 'status' in error && (error as { status: number }).status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Re-export useDirectory from admin for convenience in the reviews UI
export { useAdminDirectory as useDirectory };

// ---- Mutations ----

export function useCreateCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCycleInput) => post<CycleDto>('/cycles', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CYCLES_KEY });
    },
  });
}

export function useLaunchOrgWide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LaunchOrgWideInput) =>
      post<{ created: number; skipped: number; cycleIds: string[] }>(
        '/cycles/launch-org-wide',
        data,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CYCLES_KEY });
    },
  });
}

export function useTransition(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TransitionInput) =>
      post<CycleDto>(`/cycles/${id}/transition`, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(cycleKey(id), updated);
      void queryClient.invalidateQueries({ queryKey: CYCLES_KEY });
    },
  });
}

export function useRelease(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => post<CycleDto>(`/cycles/${id}/release`),
    onSuccess: (updated) => {
      queryClient.setQueryData(cycleKey(id), updated);
      void queryClient.invalidateQueries({ queryKey: CYCLES_KEY });
    },
  });
}

export function useAcknowledge(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AcknowledgeInput) =>
      post<CycleDto>(`/cycles/${id}/acknowledge`, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(cycleKey(id), updated);
      void queryClient.invalidateQueries({ queryKey: CYCLES_KEY });
    },
  });
}

export function useSaveDraft(id: string, side: 'self' | 'mentor') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveDraftInput) =>
      put<ReviewSubmissionDto>(`/cycles/${id}/submissions/${side}/draft`, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(submissionKey(id, side), updated);
    },
  });
}

export function useSubmitReview(id: string, side: 'self' | 'mentor') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitReviewInput) =>
      post<{ cycle: CycleDto; submission: ReviewSubmissionDto }>(
        `/cycles/${id}/submissions/${side}/submit`,
        data,
      ),
    onSuccess: ({ cycle, submission }) => {
      queryClient.setQueryData(cycleKey(id), cycle);
      queryClient.setQueryData(submissionKey(id, side), submission);
      void queryClient.invalidateQueries({ queryKey: CYCLES_KEY });
      void queryClient.invalidateQueries({ queryKey: comparisonKey(id) });
    },
  });
}
