import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../lib/api';
import type {
  CreateFeedbackRequestInput,
  FeedbackBox,
  FeedbackRequestDto,
  SubmitFeedbackInput,
} from '@perf-tracker/shared';

// ---- Query keys ----

const FEEDBACK_KEY = ['feedback'] as const;

function feedbackKey(box: FeedbackBox) {
  return [...FEEDBACK_KEY, box] as const;
}

// ---- Hooks ----

export function useFeedbackRequests(box: FeedbackBox) {
  return useQuery<FeedbackRequestDto[], Error>({
    queryKey: feedbackKey(box),
    queryFn: () => get<FeedbackRequestDto[]>(`/feedback/requests?box=${box}`),
  });
}

export function useCreateFeedbackRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeedbackRequestInput) =>
      post<FeedbackRequestDto>('/feedback/requests', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FEEDBACK_KEY });
    },
  });
}

export function useRespond() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubmitFeedbackInput }) =>
      post<FeedbackRequestDto>(`/feedback/requests/${id}/respond`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FEEDBACK_KEY });
    },
  });
}

export function useDecline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      post<FeedbackRequestDto>(`/feedback/requests/${id}/decline`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FEEDBACK_KEY });
    },
  });
}
