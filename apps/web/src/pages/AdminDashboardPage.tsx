import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useDashboard } from '../admin/useDashboard';
import type { StatusCountDto, SideDistributionDto } from '@perf-tracker/shared';

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

// ---- Status Bar Row ---------------------------------------------------------

interface StatusBarRowProps {
  row: StatusCountDto;
  max: number;
  color: string;
}

function StatusBarRow({ row, max, color }: StatusBarRowProps) {
  const pct = max > 0 ? (row.count / max) * 100 : 0;
  return (
    <TableRow>
      <TableCell sx={{ width: 180, whiteSpace: 'nowrap' }}>
        {statusLabel(row.status)}
      </TableCell>
      <TableCell>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              height: 10,
              width: `${pct}%`,
              minWidth: row.count > 0 ? 4 : 0,
              maxWidth: '100%',
              bgcolor: color,
              borderRadius: 1,
              transition: 'width 0.3s ease',
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
            {row.count}
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );
}

// ---- Score Distribution Bar -------------------------------------------------

const SCORE_LABELS = ['1', '2', '3', '4', '5'];

interface ScoreBarProps {
  dist: SideDistributionDto;
  color: string;
}

function ScoreBar({ dist, color }: ScoreBarProps) {
  const total = dist.n;
  return (
    <Box display="flex" alignItems="center" gap={0.5} width="100%">
      {dist.distribution.map((count, i) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <Box key={i} sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.disabled" display="block" mb={0.25}>
              {SCORE_LABELS[i]}
            </Typography>
            <Box
              title={`Score ${i + 1}: ${count} (${pct.toFixed(0)}%)`}
              sx={{
                height: 32,
                bgcolor: pct > 0 ? color : 'action.hover',
                opacity: pct > 0 ? 0.3 + (pct / 100) * 0.7 : 0.15,
                borderRadius: 0.5,
              }}
            />
            <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
              {count}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

// ---- Main Page --------------------------------------------------------------

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useDashboard();

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

  return (
    <Box>
      {/* Page header */}
      <Box mb={4} display="flex" alignItems="flex-start" gap={2} flexWrap="wrap">
        <Box flex={1}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Admin — Performance Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Organisation-wide roll-up across {data.totalUsers} user
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
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Goals by status
          </Typography>
          {data.goalsByStatus.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No goals recorded yet.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {data.goalsByStatus.map((row) => (
                    <StatusBarRow
                      key={row.status}
                      row={row}
                      max={goalsMax}
                      color="primary.main"
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ---- Cycles by status ---- */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Cycles by status
          </Typography>
          {data.cyclesByStatus.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No cycles recorded yet.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {data.cyclesByStatus.map((row) => (
                    <StatusBarRow
                      key={row.status}
                      row={row}
                      max={cyclesMax}
                      color="secondary.main"
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ---- Per-metric rating distribution ---- */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={0.5}>
            Rating distribution by metric
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Self-assessment vs mentor scores (scores 1–5). Compare averages to
            spot inflation or central-tendency bias.
          </Typography>

          {data.metrics.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No ratings submitted yet.
            </Typography>
          ) : (
            data.metrics.map((m, idx) => (
              <Box key={m.metricKey}>
                {idx > 0 && <Divider sx={{ my: 3 }} />}

                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  {m.metricLabel}
                </Typography>

                <Box
                  display="grid"
                  gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
                  gap={3}
                >
                  {/* Self */}
                  <Box>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      mb={1}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        Self
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {m.self.average != null
                          ? `avg ${m.self.average.toFixed(2)}`
                          : 'no data'}
                        {m.self.n > 0 ? ` · n=${m.self.n}` : ''}
                      </Typography>
                    </Box>
                    <ScoreBar dist={m.self} color="#1976d2" />
                  </Box>

                  {/* Mentor */}
                  <Box>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      mb={1}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        Mentor
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {m.mentor.average != null
                          ? `avg ${m.mentor.average.toFixed(2)}`
                          : 'no data'}
                        {m.mentor.n > 0 ? ` · n=${m.mentor.n}` : ''}
                      </Typography>
                    </Box>
                    <ScoreBar dist={m.mentor} color="#9c27b0" />
                  </Box>
                </Box>

                {/* Avg delta callout */}
                {m.self.average != null && m.mentor.average != null && (
                  <Box mt={1.5}>
                    {(() => {
                      const delta = m.mentor.average - m.self.average;
                      const abs = Math.abs(delta);
                      if (abs < 0.1) {
                        return (
                          <Typography variant="caption" color="text.secondary">
                            Self and mentor averages are closely aligned.
                          </Typography>
                        );
                      }
                      const direction = delta > 0 ? 'higher' : 'lower';
                      const flag = abs >= 1 ? ' — notable gap.' : '.';
                      return (
                        <Typography variant="caption" color="text.secondary">
                          Mentor rates {abs.toFixed(2)} points {direction} than
                          self on average{flag}
                        </Typography>
                      );
                    })()}
                  </Box>
                )}
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
