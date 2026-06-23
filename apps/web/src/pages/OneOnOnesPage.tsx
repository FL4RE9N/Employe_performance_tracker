import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArticleIcon from '@mui/icons-material/Article';

import { useMeetings } from '../meetings/useMeetings';

// ---- Helpers ----------------------------------------------------------------

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}

function meetingStatusColor(
  status: string,
): 'default' | 'info' | 'success' | 'error' {
  switch (status) {
    case 'scheduled':
      return 'info';
    case 'held':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
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

function formatScheduled(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const dateStr = s.toLocaleDateString(undefined, {
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
  return `${dateStr}, ${startTime} – ${endTime}`;
}

// ---- Main Page --------------------------------------------------------------

export default function OneOnOnesPage() {
  const { data: meetings = [], isLoading, error } = useMeetings();

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

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Meetings
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getErrorMessage(error)}
            </Alert>
          )}

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Period</TableCell>
                    <TableCell>Mentor</TableCell>
                    <TableCell>Mentee</TableCell>
                    <TableCell>Scheduled</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {meetings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No meetings scheduled yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    meetings.map((meeting) => (
                      <TableRow key={meeting.id} hover>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {meeting.periodLabel}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {meeting.mentorName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {meeting.menteeName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {formatScheduled(
                              meeting.scheduledStart,
                              meeting.scheduledEnd,
                            )}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={meetingStatusLabel(meeting.status)}
                            size="small"
                            color={meetingStatusColor(meeting.status)}
                            variant={
                              meeting.status === 'held' ? 'filled' : 'outlined'
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box
                            display="flex"
                            gap={1}
                            justifyContent="flex-end"
                            flexWrap="nowrap"
                          >
                            {meeting.teamsJoinUrl && (
                              <Button
                                size="small"
                                variant="outlined"
                                href={meeting.teamsJoinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                endIcon={<OpenInNewIcon fontSize="inherit" />}
                              >
                                Join
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="outlined"
                              component={RouterLink}
                              to={`/reviews/${meeting.cycleId}`}
                              startIcon={<ArticleIcon fontSize="inherit" />}
                            >
                              Agenda
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
