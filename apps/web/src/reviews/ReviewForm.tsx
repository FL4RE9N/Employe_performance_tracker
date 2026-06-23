/**
 * ReviewForm — shown to the mentee (side=self) when status===self_assessment_open
 * and to the mentor (side=mentor) when status===mentor_assessment_open.
 *
 * Pre-fills from a fetched draft. Supports "Save draft" and "Submit".
 */
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { submitReviewSchema, QUESTIONS, METRICS, RATING_SCALE_V1 } from '@perf-tracker/shared';
import type { SubmitReviewInput, ReviewSubmissionDto } from '@perf-tracker/shared';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';

import { useSaveDraft, useSubmitReview, useSubmission } from './useReviews';

// ---- helpers -----------------------------------------------------------------

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}

// Build default values seeded from an existing submission (draft) or blank
function buildDefaults(draft: ReviewSubmissionDto | undefined): SubmitReviewInput {
  return {
    answers: QUESTIONS.map((q) => ({
      questionKey: q.key,
      answerText:
        draft?.answers.find((a) => a.questionKey === q.key)?.answerText ?? '',
    })),
    ratings: METRICS.map((m) => ({
      metricKey: m.key,
      score: (draft?.ratings.find((r) => r.metricKey === m.key)?.score ?? 3) as
        | 1
        | 2
        | 3
        | 4
        | 5,
      comment: draft?.ratings.find((r) => r.metricKey === m.key)?.comment ?? undefined,
    })),
  };
}

// ---- Props -------------------------------------------------------------------

interface ReviewFormProps {
  cycleId: string;
  side: 'self' | 'mentor';
  disabled?: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

// ---- Component ---------------------------------------------------------------

export default function ReviewForm({
  cycleId,
  side,
  disabled = false,
  onSuccess,
  onError,
}: ReviewFormProps) {
  const { data: draft, isLoading: draftLoading } = useSubmission(cycleId, side);
  const saveDraft = useSaveDraft(cycleId, side);
  const submitReview = useSubmitReview(cycleId, side);

  const isSubmitted = draft?.status === 'submitted';
  const isLocked = disabled || isSubmitted;

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SubmitReviewInput>({
    resolver: zodResolver(submitReviewSchema),
    defaultValues: buildDefaults(draft),
  });

  // Re-seed form when draft loads
  useEffect(() => {
    if (draft !== undefined) {
      reset(buildDefaults(draft));
    }
  }, [draft, reset]);

  const pending = isSubmitting || saveDraft.isPending || submitReview.isPending;

  const handleSaveDraft = async () => {
    const values = getValues();
    const answers = values.answers?.filter((a) => a.answerText.trim().length > 0);
    const ratings = values.ratings;

    if (!answers?.length && !ratings?.length) {
      onError('Nothing to save — fill in at least one field.');
      return;
    }

    try {
      await saveDraft.mutateAsync({ answers, ratings });
      onSuccess('Draft saved.');
    } catch (err) {
      onError(getErrorMessage(err));
    }
  };

  const onSubmit = async (data: SubmitReviewInput) => {
    try {
      await submitReview.mutateAsync(data);
      onSuccess('Review submitted successfully.');
    } catch (err) {
      onError(getErrorMessage(err));
    }
  };

  if (draftLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {isSubmitted && (
        <Alert severity="success" sx={{ mb: 3 }}>
          This review has been submitted and is locked.
        </Alert>
      )}

      {/* ---- Questions ---- */}
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Written responses
      </Typography>
      <Box display="flex" flexDirection="column" gap={3} mb={4}>
        {QUESTIONS.sort((a, b) => a.order - b.order).map((q, qi) => (
          <Box key={q.key}>
            <TextField
              label={`${qi + 1}. ${q.label}`}
              fullWidth
              multiline
              minRows={4}
              disabled={isLocked || pending}
              error={!!errors.answers?.[qi]?.answerText}
              helperText={errors.answers?.[qi]?.answerText?.message}
              {...register(`answers.${qi}.answerText`)}
            />
            {/* hidden field: questionKey */}
            <input type="hidden" {...register(`answers.${qi}.questionKey`)} value={q.key} />
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* ---- Metric ratings ---- */}
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Metric ratings
      </Typography>
      <Box display="flex" flexDirection="column" gap={3} mb={4}>
        {METRICS.map((m, mi) => (
          <Box key={m.key}>
            {/* hidden field: metricKey */}
            <input type="hidden" {...register(`ratings.${mi}.metricKey`)} value={m.key} />

            <Controller
              name={`ratings.${mi}.score`}
              control={control}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  error={!!errors.ratings?.[mi]?.score}
                  disabled={isLocked || pending}
                >
                  <InputLabel id={`rating-label-${m.key}`}>{m.label}</InputLabel>
                  <Select
                    {...field}
                    labelId={`rating-label-${m.key}`}
                    label={m.label}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    {RATING_SCALE_V1.levels.map((level) => (
                      <MenuItem key={level.score} value={level.score}>
                        <Tooltip title={level.anchor} placement="right">
                          <Box>
                            <strong>{level.score} — {level.label}</strong>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              {level.anchor}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.ratings?.[mi]?.score && (
                    <FormHelperText>{errors.ratings[mi]?.score?.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            <TextField
              label={`${m.label} — comment (optional)`}
              fullWidth
              multiline
              minRows={2}
              disabled={isLocked || pending}
              sx={{ mt: 1.5 }}
              {...register(`ratings.${mi}.comment`)}
            />
          </Box>
        ))}
      </Box>

      {/* ---- Actions ---- */}
      {!isSubmitted && (
        <Box display="flex" gap={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            startIcon={
              saveDraft.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            disabled={isLocked || pending}
            onClick={handleSaveDraft}
            type="button"
          >
            {saveDraft.isPending ? 'Saving…' : 'Save draft'}
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={
              submitReview.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SendIcon />
              )
            }
            disabled={isLocked || pending}
          >
            {submitReview.isPending ? 'Submitting…' : 'Submit review'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
