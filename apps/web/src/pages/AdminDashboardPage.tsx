import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '@mui/material/styles';

import { useDashboard } from '../admin/useDashboard';
import type { StatusCountDto, SideDistributionDto } from '@perf-tracker/shared';
import { TOKENS } from '../theme';

// ---- Helpers ----------------------------------------------------------------

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}

function statusLabel(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---- Horizontal status bar row ----------------------------------------------
// Clean labeled track: [StatusChip] [████░░░░░░] [count]
// The track fills relative to max. No table — pure flex.

interface StatusBarRowProps {
  row: StatusCountDto;
  max: number;
  trackColor: string;
  chipBg: string;
  chipText: string;
}

function StatusBarRow({ row, max, trackColor, chipBg, chipText }: StatusBarRowProps) {
  const pct = max > 0 ? (row.count / max) * 100 : 0;

  return (
    <Box display="flex" alignItems="center" gap={1.5} py={0.75}>
      {/* Status label chip */}
      <Chip
        label={statusLabel(row.status)}
        size="small"
        sx={{
          bgcolor: chipBg,
          color: chipText,
          fontWeight: 600,
          border: 'none',
          fontSize: '0.72rem',
          minWidth: 128,
          justifyContent: 'flex-start',
        }}
      />
      {/* Track */}
      <Box
        sx={(theme) => ({
          flex: 1,
          height: 8,
          borderRadius: 4,
          bgcolor: TOKENS[theme.palette.mode].surface2,
          overflow: 'hidden',
          minWidth: 60,
        })}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: '100%',
            bgcolor: trackColor,
            borderRadius: 4,
            transition: 'width .35s ease',
          }}
        />
      </Box>
      {/* Count */}
      <Typography
        variant="body2"
        fontWeight={600}
        sx={(theme) => ({
          color: TOKENS[theme.palette.mode === 'light' ? 'light' : 'dark'].muted,
          minWidth: 24,
          textAlign: 'right',
          flexShrink: 0,
        })}
      >
        {row.count}
      </Typography>
    </Box>
  );
}

// ---- Vertical rating distribution bars --------------------------------------
//
// The aesthetic risk: score buckets 1–5 rendered as vertical bars that grow
// upward inside a fixed-height container. Self (primary) and mentor (violet)
// bars sit side-by-side within each bucket, making comparison instantaneous.
// No charting library — pure CSS flex-column with percentage heights.

const SCORE_LABELS = ['1', '2', '3', '4', '5'];
const CHART_HEIGHT = 72; // px — fixed container height for all bars

interface VerticalScoreChartProps {
  self: SideDistributionDto;
  mentor: SideDistributionDto;
  primaryColor: string;
  violetColor: string;
  surface2Color: string;
  mutedColor: string;
  faintColor: string;
}

function VerticalScoreChart({
  self,
  mentor,
  primaryColor,
  violetColor,
  surface2Color,
  mutedColor,
  faintColor,
}: VerticalScoreChartProps) {
  const selfMax = Math.max(...self.distribution, 1);
  const mentorMax = Math.max(...mentor.distribution, 1);
  const globalMax = Math.max(selfMax, mentorMax);

  return (
    <Box>
      {/* Legend */}
      <Box display="flex" gap={2.5} mb={1.5}>
        <Box display="flex" alignItems="center" gap={0.75}>
          <Box
            sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: primaryColor, flexShrink: 0 }}
          />
          <Typography variant="caption" sx={{ color: mutedColor, fontWeight: 600 }}>
            Self
          </Typography>
          {self.average != null && (
            <Typography variant="caption" sx={{ color: faintColor }}>
              avg {self.average.toFixed(2)} &middot; n={self.n}
            </Typography>
          )}
        </Box>
        <Box display="flex" alignItems="center" gap={0.75}>
          <Box
            sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: violetColor, flexShrink: 0 }}
          />
          <Typography variant="caption" sx={{ color: mutedColor, fontWeight: 600 }}>
            Mentor
          </Typography>
          {mentor.average != null && (
            <Typography variant="caption" sx={{ color: faintColor }}>
              avg {mentor.average.toFixed(2)} &middot; n={mentor.n}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Chart columns */}
      <Box display="flex" gap={1} alignItems="flex-end">
        {SCORE_LABELS.map((label, i) => {
          const selfCount = self.distribution[i] ?? 0;
          const mentorCount = mentor.distribution[i] ?? 0;
          const selfPct = (selfCount / globalMax) * 100;
          const mentorPct = (mentorCount / globalMax) * 100;

          return (
            <Box
              key={label}
              sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}
            >
              {/* Fixed-height column */}
              <Box
                sx={{
                  width: '100%',
                  height: CHART_HEIGHT,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  gap: '3px',
                  bgcolor: surface2Color,
                  borderRadius: 1.5,
                  px: '4px',
                  pt: '4px',
                }}
              >
                {/* Self bar */}
                <Tooltip title={`Self — score ${label}: ${selfCount}`} arrow>
                  <Box
                    sx={{
                      flex: 1,
                      height: selfPct > 0 ? `${Math.max(selfPct, 6)}%` : '4%',
                      bgcolor: selfPct > 0 ? primaryColor : surface2Color,
                      borderRadius: '3px 3px 0 0',
                      transition: 'height .35s ease',
                      opacity: selfPct > 0 ? 0.85 + (selfPct / 100) * 0.15 : 0.35,
                      cursor: 'default',
                    }}
                  />
                </Tooltip>
                {/* Mentor bar */}
                <Tooltip title={`Mentor — score ${label}: ${mentorCount}`} arrow>
                  <Box
                    sx={{
                      flex: 1,
                      height: mentorPct > 0 ? `${Math.max(mentorPct, 6)}%` : '4%',
                      bgcolor: mentorPct > 0 ? violetColor : surface2Color,
                      borderRadius: '3px 3px 0 0',
                      transition: 'height .35s ease',
                      opacity: mentorPct > 0 ? 0.85 + (mentorPct / 100) * 0.15 : 0.35,
                      cursor: 'default',
                    }}
                  />
                </Tooltip>
              </Box>

              {/* Score label */}
              <Typography variant="caption" sx={{ color: faintColor, fontWeight: 600 }}>
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ---- Main Page --------------------------------------------------------------

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useDashboard();
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">{getErrorMessage(error)}</Alert>
      </Box>
    );
  }

  if (!data) return null;

  const goalsMax = Math.max(...data.goalsByStatus.map((r) => r.count), 1);
  const cyclesMax = Math.max(...data.cyclesByStatus.map((r) => r.count), 1);

  // Goal status → token color mapping (soft bg, strong text)
  function goalStatusTokens(status: string): { bg: string; text: string } {
    switch (status) {
      case 'active':
        return { bg: t.primarySoft, text: t.primary };
      case 'at_risk':
        return { bg: t.amberSoft, text: t.amber };
      case 'done':
        return { bg: t.successSoft, text: t.success };
      case 'dropped':
        return { bg: t.surface2, text: t.faint };
      default:
        return { bg: t.surface2, text: t.muted };
    }
  }

  // Cycle status — simpler mapping
  function cycleStatusTokens(status: string): { bg: string; text: string } {
    if (status.includes('submitted') || status.includes('released') || status === 'acknowledged') {
      return { bg: t.successSoft, text: t.success };
    }
    if (status.includes('open') || status === 'calibration') {
      return { bg: t.amberSoft, text: t.amber };
    }
    if (status.includes('scheduled') || status === 'goals_set') {
      return { bg: t.primarySoft, text: t.primary };
    }
    if (status === 'closed') {
      return { bg: t.surface2, text: t.muted };
    }
    return { bg: t.surface2, text: t.muted };
  }

  return (
    <Box>
      {/* Page header */}
      <Box mb={4} display="flex" alignItems="flex-start" gap={2} flexWrap="wrap">
        <Box flex={1}>
          <Typography
            variant="overline"
            component="div"
            sx={{ fontSize: '0.68rem', letterSpacing: '.1em', color: t.muted, mb: 0.5 }}
          >
            Admin
          </Typography>
          <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mt: 0 }}>
            Performance overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Organisation-wide roll-up across{' '}
            <strong>{data.totalUsers}</strong> user
            {data.totalUsers !== 1 ? 's' : ''}.
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to="/admin"
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          size="small"
          sx={{ mt: 0.5, flexShrink: 0 }}
        >
          Back to users
        </Button>
      </Box>

      {/* ---- Goals by status ---- */}
      <Typography
        variant="overline"
        component="div"
        sx={{ fontSize: '0.68rem', letterSpacing: '.1em', color: t.muted, mb: 1.5 }}
      >
        Goals
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2.5}>
            Goals by status
          </Typography>
          {data.goalsByStatus.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No goals recorded yet.
            </Typography>
          ) : (
            <Box display="flex" flexDirection="column" gap={0.5}>
              {data.goalsByStatus.map((row) => {
                const { bg, text } = goalStatusTokens(row.status);
                return (
                  <StatusBarRow
                    key={row.status}
                    row={row}
                    max={goalsMax}
                    trackColor={t.primary}
                    chipBg={bg}
                    chipText={text}
                  />
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ---- Cycles by status ---- */}
      <Typography
        variant="overline"
        component="div"
        sx={{ fontSize: '0.68rem', letterSpacing: '.1em', color: t.muted, mb: 1.5 }}
      >
        Review cycles
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2.5}>
            Cycles by status
          </Typography>
          {data.cyclesByStatus.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No cycles recorded yet.
            </Typography>
          ) : (
            <Box display="flex" flexDirection="column" gap={0.5}>
              {data.cyclesByStatus.map((row) => {
                const { bg, text } = cycleStatusTokens(row.status);
                return (
                  <StatusBarRow
                    key={row.status}
                    row={row}
                    max={cyclesMax}
                    trackColor={t.violet}
                    chipBg={bg}
                    chipText={text}
                  />
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ---- Per-metric rating distribution ---- */}
      <Typography
        variant="overline"
        component="div"
        sx={{ fontSize: '0.68rem', letterSpacing: '.1em', color: t.muted, mb: 1.5 }}
      >
        Rating distributions
      </Typography>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={0.5}>
            Self vs mentor scores by metric
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Score distribution across all submissions, 1–5.
            Bars grow upward — taller means more responses at that score.
          </Typography>

          {data.metrics.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No ratings submitted yet.
            </Typography>
          ) : (
            data.metrics.map((m, idx) => (
              <Box key={m.metricKey}>
                {idx > 0 && <Divider sx={{ my: 3.5 }} />}

                <Box
                  display="flex"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  flexWrap="wrap"
                  gap={1}
                  mb={2}
                >
                  <Typography variant="subtitle1" fontWeight={600}>
                    {m.metricLabel}
                  </Typography>

                  {/* Delta callout as a compact chip */}
                  {m.self.average != null && m.mentor.average != null && (() => {
                    const delta = m.mentor.average - m.self.average;
                    const abs = Math.abs(delta);
                    if (abs < 0.1) {
                      return (
                        <Chip
                          label="Closely aligned"
                          size="small"
                          sx={{ bgcolor: t.successSoft, color: t.success, fontWeight: 600, border: 'none', fontSize: '0.72rem' }}
                        />
                      );
                    }
                    const direction = delta > 0 ? 'mentor higher' : 'self higher';
                    const severity = abs >= 1;
                    return (
                      <Chip
                        label={`${direction} by ${abs.toFixed(2)}${severity ? ' — notable' : ''}`}
                        size="small"
                        sx={{
                          bgcolor: severity ? t.amberSoft : t.surface2,
                          color: severity ? t.amber : t.muted,
                          fontWeight: 600,
                          border: 'none',
                          fontSize: '0.72rem',
                        }}
                      />
                    );
                  })()}
                </Box>

                <VerticalScoreChart
                  self={m.self}
                  mentor={m.mentor}
                  primaryColor={t.primary}
                  violetColor={t.violet}
                  surface2Color={t.surface2}
                  mutedColor={t.muted}
                  faintColor={t.faint}
                />
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
