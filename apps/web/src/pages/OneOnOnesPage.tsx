import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import ArticleIcon from '@mui/icons-material/Article';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonIcon from '@mui/icons-material/Person';
import { useTheme } from '@mui/material/styles';

import { useMeetings } from '../meetings/useMeetings';
import { TOKENS } from '../theme';
import type { Tokens } from '../theme';

// ---- Helpers ----------------------------------------------------------------

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}

/** Returns token-based sx values for the meeting status chip. */
function meetingStatusSx(
  status: string,
  t: Tokens,
): { bgcolor: string; color: string } {
  switch (status) {
    case 'scheduled':
      return { bgcolor: t.primarySoft, color: t.primary };
    case 'held':
      return { bgcolor: t.successSoft, color: t.success };
    case 'cancelled':
      return { bgcolor: t.surface2, color: t.muted };
    default:
      return { bgcolor: t.surface2, color: t.muted };
  }
}

function meetingStatusLabel(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'held':
      return 'Held';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function formatScheduled(start: string, end: string): { date: string; time: string } {
  const s = new Date(start);
  const e = new Date(end);
  const date = s.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const startTime = s.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = e.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { date, time: `${startTime} – ${endTime}` };
}

// ---- Main Page --------------------------------------------------------------

export default function OneOnOnesPage() {
  const { data: meetings = [], isLoading, error } = useMeetings();
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

  return (
    <Box>
      {/* Page header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          1-on-1s
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your scheduled review meetings with notes and agendas.
        </Typography>
      </Box>

      {/* Section label */}
      <Typography
        variant="overline"
        component="div"
        sx={{
          fontSize: '0.68rem',
          letterSpacing: '.1em',
          color: t.muted,
          mb: 1.5,
        }}
      >
        Meetings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getErrorMessage(error)}
        </Alert>
      )}

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No meetings scheduled yet.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {meetings.map((meeting) => {
            const { date, time } = formatScheduled(
              meeting.scheduledStart,
              meeting.scheduledEnd,
            );
            const chipSx = meetingStatusSx(meeting.status, t);

            return (
              <Card key={meeting.id}>
                <CardContent sx={{ p: 3 }}>
                  {/* Top row: period pill + status chip */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    {/* Period pill */}
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 1.25,
                        py: 0.4,
                        borderRadius: '999px',
                        bgcolor: t.surface2,
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ color: t.muted, letterSpacing: '.03em' }}
                      >
                        {meeting.periodLabel}
                      </Typography>
                    </Box>

                    {/* Status chip */}
                    <Chip
                      label={meetingStatusLabel(meeting.status)}
                      size="small"
                      sx={{
                        ...chipSx,
                        fontWeight: 600,
                        borderRadius: '999px',
                        border: 'none',
                      }}
                    />
                  </Box>

                  {/* Participants row */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      mb: 1.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Mentor */}
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1,
                        py: 0.4,
                        borderRadius: '999px',
                        bgcolor: t.violetSoft,
                      }}
                    >
                      <PersonIcon
                        sx={{ fontSize: 13, color: t.violet }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{ color: t.violet }}
                      >
                        {meeting.mentorName}
                      </Typography>
                    </Box>

                    {/* Arrow between participants */}
                    <Typography
                      variant="caption"
                      sx={{ color: t.faint, userSelect: 'none' }}
                    >
                      &rarr;
                    </Typography>

                    {/* Mentee */}
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1,
                        py: 0.4,
                        borderRadius: '999px',
                        bgcolor: t.primarySoft,
                      }}
                    >
                      <PersonIcon
                        sx={{ fontSize: 13, color: t.primary }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{ color: t.primary }}
                      >
                        {meeting.menteeName}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Date + time row */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      mb: 2.5,
                    }}
                  >
                    <CalendarTodayIcon
                      sx={{ fontSize: 13, color: t.faint }}
                    />
                    <Typography variant="body2" sx={{ color: t.muted }}>
                      {date}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: t.faint, mx: 0.25 }}
                    >
                      &middot;
                    </Typography>
                    <Typography variant="body2" sx={{ color: t.muted }}>
                      {time}
                    </Typography>
                  </Box>

                  <Divider sx={{ mb: 2, borderColor: t.border }} />

                  {/* Actions row */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {meeting.teamsJoinUrl && (
                      <Button
                        variant="contained"
                        size="small"
                        href={meeting.teamsJoinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        endIcon={<OpenInNewIcon fontSize="inherit" />}
                      >
                        Join (Teams)
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      component={RouterLink}
                      to={`/reviews/${meeting.cycleId}`}
                      startIcon={<ArticleIcon fontSize="inherit" />}
                    >
                      Agenda
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
