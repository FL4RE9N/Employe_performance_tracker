/**
 * ReviewForm — shown to the mentee (side=self) when status===self_assessment_open
 * and to the mentor (side=mentor) when status===mentor_assessment_open.
 *
 * Pre-fills from a fetched draft. Supports "Save draft" and "Submit & lock".
 */
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { submitReviewSchema, QUESTIONS, METRICS, RATING_SCALE_V1 } from '@perf-tracker/shared';
import type { SubmitReviewInput, ReviewSubmissionDto } from '@perf-tracker/shared';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import FormHelperText from '@mui/material/FormHelperText';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import LockIcon from '@mui/icons-material/Lock';
import SaveIcon from '@mui/icons-material/Save';
import { useTheme } from '@mui/material/styles';

import { useSaveDraft, useSubmitReview, useSubmission } from './useReviews';
import { TOKENS } from '../theme';

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

// ---- ScorePills: a segmented row of 5 selectable pills -----------------------

interface ScorePillsProps {
  value: number;
  onChange: (val: number) => void;
  disabled: boolean;
}

function ScorePills({ value, onChange, disabled }: ScorePillsProps) {
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
      }}
      role="group"
    >
      {RATING_SCALE_V1.levels.map((level) => {
        const isSelected = value === level.score;
        return (
          <Tooltip key={level.score} title={level.anchor} placement="top">
            <Box
              component="button"
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(level.score)}
              aria-pressed={isSelected}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.25,
                px: 1.5,
                py: 0.75,
                borderRadius: '999px',
                border: `1.5px solid`,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all .15s',
                background: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                '&:focus-visible': {
                  boxShadow: `0 0 0 2px ${t.primary}`,
                },
                borderColor: isSelected ? t.primary : t.border,
                bgcolor: isSelected ? t.primarySoft : t.surface2,
                color: isSelected ? t.primary : t.muted,
                opacity: disabled ? 0.55 : 1,
              }}
            >
              <Typography
                component="span"
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: isSelected ? 700 : 500,
                  lineHeight: 1.2,
                  color: 'inherit',
                  whiteSpace: 'nowrap',
                }}
              >
                {level.score} — {level.label}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

// ---- Component ---------------------------------------------------------------

export default function ReviewForm({
  cycleId,
  side,
  disabled = false,
  onSuccess,
  onError,
}: ReviewFormProps) {
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

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

  const sortedQuestions = [...QUESTIONS].sort((a, b) => a.order - b.order);

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {isSubmitted && (
        <Alert severity="success" sx={{ mb: 3 }}>
          This review has been submitted and is locked.
        </Alert>
      )}

      {/* ---- Questions ---- */}
      <Typography
        variant="overline"
        component="div"
        sx={{ fontSize: '0.68rem', letterSpacing: '.1em', color: t.muted, mb: 1.5 }}
      >
        Written responses
      </Typography>

      <Box display="flex" flexDirection="column" gap={2} mb={4}>
        {sortedQuestions.map((q, qi) => (
          <Card
            key={q.key}
            variant="outlined"
            sx={{ boxShadow: 'none', border: `1px solid ${t.border}` }}
          >
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography
                variant="subtitle2"
                fontWeight={600}
                sx={{ mb: 1.5, color: t.text }}
              >
                {qi + 1}. {q.label}
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={4}
                disabled={isLocked || pending}
                error={!!errors.answers?.[qi]?.answerText}
                helperText={errors.answers?.[qi]?.answerText?.message}
                placeholder="Share your thoughts…"
                {...register(`answers.${qi}.answerText`)}
              />
              {/* hidden field: questionKey */}
              <input type="hidden" {...register(`answers.${qi}.questionKey`)} value={q.key} />
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* ---- Metric ratings ---- */}
      <Typography
        variant="overline"
        component="div"
        sx={{ fontSize: '0.68rem', letterSpacing: '.1em', color: t.muted, mb: 1.5 }}
      >
        Metric ratings
      </Typography>

      <Box display="flex" flexDirection="column" gap={2} mb={4}>
        {METRICS.map((m, mi) => (
          <Card
            key={m.key}
            variant="outlined"
            sx={{ boxShadow: 'none', border: `1px solid ${t.border}` }}
          >
            <CardContent sx={{ pb: '16px !important' }}>
              {/* hidden field: metricKey */}
              <input type="hidden" {...register(`ratings.${mi}.metricKey`)} value={m.key} />

              <Typography
                variant="subtitle2"
                fontWeight={600}
                sx={{ mb: 0.5, color: t.text }}
              >
                {m.label}
              </Typography>
              <Typography variant="caption" sx={{ color: t.muted, display: 'block', mb: 1.5 }}>
                {m.description}
              </Typography>

              <Controller
                name={`ratings.${mi}.score`}
                control={control}
                render={({ field }) => (
                  <Box>
                    <ScorePills
                      value={field.value ?? 3}
                      onChange={(val) => field.onChange(val)}
                      disabled={isLocked || pending}
                    />
                    {errors.ratings?.[mi]?.score && (
                      <FormHelperText error sx={{ mt: 0.5 }}>
                        {errors.ratings[mi]?.score?.message}
                      </FormHelperText>
                    )}
                  </Box>
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
            </CardContent>
          </Card>
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
                <LockIcon />
              )
            }
            disabled={isLocked || pending}
          >
            {submitReview.isPending ? 'Submitting…' : 'Submit & lock'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
