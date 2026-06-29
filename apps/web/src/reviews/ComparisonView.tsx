/**
 * ComparisonView — renders side-by-side self vs mentor answers + metric gaps.
 *
 * If the API returns 403 → show sealed/locked state.
 * If releaseGated → show only self side with a note.
 */
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import { useComparison } from './useReviews';
import { QUESTIONS, METRICS } from '@perf-tracker/shared';
import { reveal, sealBreak } from './animations';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useTheme } from '@mui/material/styles';

import { TOKENS, BRAND_GRADIENT } from '../theme';
import type { Tokens } from '../theme';

// ---- helpers -----------------------------------------------------------------

/**
 * Returns token keys for delta chip coloring.
 * |delta|<=1 → success, ==2 → amber, >=3 → red
 */
function deltaTokens(
  delta: number | null,
  t: Tokens,
): { bg: string; text: string; label: string } {
  if (delta === null) return { bg: t.surface2, text: t.muted, label: '—' };
  const abs = Math.abs(delta);
  const label = delta > 0 ? `+${delta}` : String(delta);
  if (abs <= 1) return { bg: t.successSoft, text: t.success, label };
  if (abs === 2) return { bg: t.amberSoft, text: t.amber, label };
  return { bg: t.redSoft, text: t.red, label };
}

// ---- Props -------------------------------------------------------------------

interface ComparisonViewProps {
  cycleId: string;
}

// ---- Score bar ---------------------------------------------------------------

interface ScoreBarProps {
  selfScore: number | null;
  mentorScore: number | null;
  primary: string;
  violet: string;
  surface2: string;
}

function ScoreBars({ selfScore, mentorScore, primary, violet, surface2 }: ScoreBarProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {/* Self bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" sx={{ color: primary, fontWeight: 600, width: 32, flexShrink: 0 }}>
          You
        </Typography>
        <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: surface2, overflow: 'hidden' }}>
          <Box
            sx={{
              width: selfScore != null ? `${(selfScore / 5) * 100}%` : '0%',
              height: '100%',
              bgcolor: primary,
              borderRadius: 3,
              transition: 'width .4s ease',
            }}
          />
        </Box>
        <Typography variant="caption" sx={{ color: primary, fontWeight: 700, width: 16, textAlign: 'right', flexShrink: 0 }}>
          {selfScore ?? '—'}
        </Typography>
      </Box>
      {/* Mentor bar */}
      {mentorScore != null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: violet, fontWeight: 600, width: 32, flexShrink: 0 }}>
            Mentor
          </Typography>
          <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: surface2, overflow: 'hidden' }}>
            <Box
              sx={{
                width: `${(mentorScore / 5) * 100}%`,
                height: '100%',
                bgcolor: violet,
                borderRadius: 3,
                transition: 'width .4s ease',
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: violet, fontWeight: 700, width: 16, textAlign: 'right', flexShrink: 0 }}>
            {mentorScore}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ---- Component ---------------------------------------------------------------

export default function ComparisonView({ cycleId }: ComparisonViewProps) {
  const { data, isLoading, error } = useComparison(cycleId);
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

  // One-time "seal opens" ceremony when the full comparison first reveals in this
  // session (per cycle). Pure presentation — no data/behavior change.
  const [sealing, setSealing] = useState(false);
  useEffect(() => {
    if (!data || data.releaseGated) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const key = `pt-revealed-${cycleId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      return;
    }
    setSealing(true);
    const id = window.setTimeout(() => setSealing(false), 850);
    return () => window.clearTimeout(id);
  }, [data, cycleId]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    const status = error instanceof ApiError ? error.status : 0;
    if (status === 403) {
      // Sealed / locked state
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            py: 6,
            px: 3,
            gap: 2,
          }}
        >
          {/* Seal badge */}
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: BRAND_GRADIENT(t),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: t.shadowMd,
              mb: 0.5,
            }}
          >
            <LockIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Box>

          <Typography variant="h6" fontWeight={700} sx={{ color: t.text }}>
            Your reviews are sealed
          </Typography>
          <Typography variant="body2" sx={{ color: t.muted, maxWidth: 360 }}>
            Both sides are submitted privately. Once your meeting has taken place,
            your manager will release the comparison — and you&apos;ll see everything side by side.
          </Typography>
        </Box>
      );
    }
    return (
      <Alert severity="error">
        {error.message || 'Failed to load comparison.'}
      </Alert>
    );
  }

  if (!data) return null;

  const { self, mentor, gaps, releaseGated } = data;

  const sortedQuestions = [...QUESTIONS].sort((a, b) => a.order - b.order);

  // Reduced-motion media query check (inline, no hook needed)
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealAnimation = prefersReducedMotion ? undefined : `${reveal} .3s ease`;

  return (
    <>
      {sealing && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: (th) => th.zIndex.modal + 2,
          }}
        >
          <Box
            sx={{
              width: 104,
              height: 104,
              borderRadius: '50%',
              background: BRAND_GRADIENT(t),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: t.shadowLg,
              animation: `${sealBreak} .85s cubic-bezier(.4,0,.2,1) forwards`,
            }}
          >
            <LockOpenIcon sx={{ color: '#fff', fontSize: 48 }} />
          </Box>
        </Box>
      )}
    <Box
      sx={{
        animation: revealAnimation,
      }}
    >
      {releaseGated && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Your mentor&apos;s review will be shared with you after your review meeting.
          You can see your own self-assessment below.
        </Alert>
      )}

      {/* ---- Side-by-side written answers ---- */}
      <Typography
        variant="overline"
        component="div"
        sx={{ fontSize: '0.68rem', letterSpacing: '.1em', color: t.muted, mb: 1.5 }}
      >
        Written responses
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Self column */}
        <Grid item xs={12} md={releaseGated ? 12 : 6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: '999px',
                  bgcolor: t.primarySoft,
                  mb: 2,
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{ color: t.primary, letterSpacing: '.03em' }}
                >
                  You
                </Typography>
              </Box>
              {self ? (
                sortedQuestions.map((q, qi) => {
                  const answer = self.answers.find((a) => a.questionKey === q.key);
                  return (
                    <Box key={q.key} mb={qi < sortedQuestions.length - 1 ? 2.5 : 0}>
                      <Typography variant="caption" sx={{ color: t.muted, fontWeight: 600, display: 'block', mb: 0.5 }}>
                        {q.label}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: t.text }}>
                        {answer?.answerText || <em style={{ opacity: 0.45 }}>No answer provided</em>}
                      </Typography>
                      {qi < sortedQuestions.length - 1 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  );
                })
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Self assessment not yet submitted.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Mentor column — hidden when releaseGated */}
        {!releaseGated && (
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: '999px',
                    bgcolor: t.violetSoft,
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{ color: t.violet, letterSpacing: '.03em' }}
                  >
                    Your mentor
                  </Typography>
                </Box>
                {mentor ? (
                  sortedQuestions.map((q, qi) => {
                    const answer = mentor.answers.find((a) => a.questionKey === q.key);
                    return (
                      <Box key={q.key} mb={qi < sortedQuestions.length - 1 ? 2.5 : 0}>
                        <Typography variant="caption" sx={{ color: t.muted, fontWeight: 600, display: 'block', mb: 0.5 }}>
                          {q.label}
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: t.text }}>
                          {answer?.answerText || <em style={{ opacity: 0.45 }}>No answer provided</em>}
                        </Typography>
                        {qi < sortedQuestions.length - 1 && <Divider sx={{ mt: 2 }} />}
                      </Box>
                    );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Mentor assessment not yet submitted.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* ---- Metric scores with visual bars ---- */}
      {!releaseGated && (
        <>
          <Typography
            variant="overline"
            component="div"
            sx={{ fontSize: '0.68rem', letterSpacing: '.1em', color: t.muted, mb: 1.5 }}
          >
            Metric scores
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {METRICS.map((m) => {
              const gap = gaps.find((g) => g.metricKey === m.key);
              const delta = gap?.delta ?? null;
              const dtk = deltaTokens(delta, t);

              return (
                <Card
                  key={m.key}
                  variant="outlined"
                  sx={{ boxShadow: 'none', border: `1px solid ${t.border}` }}
                >
                  <CardContent sx={{ pb: '16px !important' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 2,
                        mb: 1.5,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600} sx={{ color: t.text }}>
                        {m.label}
                      </Typography>
                      <Chip
                        label={dtk.label}
                        size="small"
                        sx={{
                          bgcolor: dtk.bg,
                          color: dtk.text,
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          height: 22,
                          border: 'none',
                        }}
                      />
                    </Box>

                    <ScoreBars
                      selfScore={gap?.selfScore ?? null}
                      mentorScore={gap?.mentorScore ?? null}
                      primary={t.primary}
                      violet={t.violet}
                      surface2={t.surface2}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </>
      )}
    </Box>
    </>
  );
}
