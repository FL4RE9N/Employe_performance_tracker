/**
 * ComparisonView — renders side-by-side self vs mentor answers + metric gaps table.
 *
 * If the API returns 403 → show "locked" message.
 * If releaseGated → show only self side with a note.
 */
import { ApiError } from '../lib/api';
import { useComparison } from './useReviews';
import { QUESTIONS, METRICS } from '@perf-tracker/shared';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

// ---- helpers -----------------------------------------------------------------

function deltaColor(delta: number | null): 'default' | 'success' | 'error' | 'warning' {
  if (delta === null) return 'default';
  if (delta > 0) return 'success';
  if (delta < 0) return 'error';
  return 'warning';
}

function deltaLabel(delta: number | null): string {
  if (delta === null) return '—';
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

// ---- Props -------------------------------------------------------------------

interface ComparisonViewProps {
  cycleId: string;
}

// ---- Component ---------------------------------------------------------------

export default function ComparisonView({ cycleId }: ComparisonViewProps) {
  const { data, isLoading, error } = useComparison(cycleId);

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
      return (
        <Alert severity="info">
          Comparison unlocks once both sides submit their reviews.
        </Alert>
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

  return (
    <Box>
      {releaseGated && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Your mentor&apos;s review will be shared with you after your review meeting.
          You can see your own self-assessment below.
        </Alert>
      )}

      {/* ---- Side-by-side written answers ---- */}
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Written responses
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Self column */}
        <Grid item xs={12} md={releaseGated ? 12 : 6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                Self assessment
              </Typography>
              {self ? (
                sortedQuestions.map((q) => {
                  const answer = self.answers.find((a) => a.questionKey === q.key);
                  return (
                    <Box key={q.key} mb={2}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {q.label}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                        {answer?.answerText || <em style={{ opacity: 0.5 }}>No answer provided</em>}
                      </Typography>
                      <Divider sx={{ mt: 2 }} />
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
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom color="secondary">
                  Mentor assessment
                </Typography>
                {mentor ? (
                  sortedQuestions.map((q) => {
                    const answer = mentor.answers.find((a) => a.questionKey === q.key);
                    return (
                      <Box key={q.key} mb={2}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {q.label}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                          {answer?.answerText || <em style={{ opacity: 0.5 }}>No answer provided</em>}
                        </Typography>
                        <Divider sx={{ mt: 2 }} />
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

      {/* ---- Metric gaps table ---- */}
      {!releaseGated && (
        <>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Metric scores
          </Typography>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell align="center">Self</TableCell>
                  <TableCell align="center">Mentor</TableCell>
                  <TableCell align="center">Delta</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {METRICS.map((m) => {
                  const gap = gaps.find((g) => g.metricKey === m.key);
                  const delta = gap?.delta ?? null;
                  return (
                    <TableRow key={m.key} hover>
                      <TableCell>{m.label}</TableCell>
                      <TableCell align="center">
                        {gap?.selfScore ?? '—'}
                      </TableCell>
                      <TableCell align="center">
                        {gap?.mentorScore ?? '—'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={deltaLabel(delta)}
                          size="small"
                          color={deltaColor(delta)}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
